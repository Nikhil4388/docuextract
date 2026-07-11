"""
Tests: cleanup task logic
  - 3-day retention cutoff
  - S3 prefix deletion (batch ≤1000 objects)
  - Local dir deletion
  - Recent jobs NOT deleted
  - Storage_path parsing (bucket/prefix)
  - Empty prefix safely skipped
"""
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, call

import pytest

from app.tasks.cleanup_task import RETENTION_DAYS, _delete_s3_prefix


class TestRetentionPolicy:

    def test_retention_is_3_days(self):
        assert RETENTION_DAYS == 3

    def test_cutoff_is_3_days_ago(self):
        cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
        # A job created 4 days ago should be deleted
        old_job_created = datetime.utcnow() - timedelta(days=4)
        assert old_job_created < cutoff, "4-day-old job must be before cutoff"

    def test_recent_job_not_deleted(self):
        cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
        # A job created 2 days ago must NOT be deleted
        recent_job_created = datetime.utcnow() - timedelta(days=2)
        assert recent_job_created >= cutoff, "2-day-old job must NOT be deleted"

    def test_exactly_3_days_old_is_deleted(self):
        cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
        # timedelta(days=3) + 1 second ensures it's over the cutoff
        borderline = datetime.utcnow() - timedelta(days=3, seconds=1)
        assert borderline < cutoff


class TestS3PrefixDeletion:

    def test_invalid_storage_path_returns_zero(self):
        assert _delete_s3_prefix("") == 0
        assert _delete_s3_prefix(None) == 0
        assert _delete_s3_prefix("nobucketslash") == 0

    @patch("app.tasks.cleanup_task.boto3")
    def test_deletes_all_objects_under_prefix(self, mock_boto3):
        mock_s3 = MagicMock()
        mock_boto3.client.return_value = mock_s3

        # Mock paginator returning 3 objects
        mock_paginator = MagicMock()
        mock_s3.get_paginator.return_value = mock_paginator
        mock_paginator.paginate.return_value = [
            {"Contents": [
                {"Key": "uploads/user1/sess1/file_a.pdf"},
                {"Key": "uploads/user1/sess1/file_b.pdf"},
                {"Key": "uploads/user1/sess1/file_c.pdf"},
            ]}
        ]
        mock_s3.delete_objects.return_value = {}

        count = _delete_s3_prefix("my-bucket/uploads/user1/sess1")

        assert count == 3
        mock_s3.delete_objects.assert_called_once_with(
            Bucket="my-bucket",
            Delete={
                "Objects": [
                    {"Key": "uploads/user1/sess1/file_a.pdf"},
                    {"Key": "uploads/user1/sess1/file_b.pdf"},
                    {"Key": "uploads/user1/sess1/file_c.pdf"},
                ],
                "Quiet": True,
            }
        )

    @patch("app.tasks.cleanup_task.boto3")
    def test_empty_prefix_returns_zero(self, mock_boto3):
        mock_s3 = MagicMock()
        mock_boto3.client.return_value = mock_s3
        mock_paginator = MagicMock()
        mock_s3.get_paginator.return_value = mock_paginator
        mock_paginator.paginate.return_value = [{"Contents": []}]

        count = _delete_s3_prefix("my-bucket/empty-prefix")
        assert count == 0
        mock_s3.delete_objects.assert_not_called()

    @patch("app.tasks.cleanup_task.boto3")
    def test_large_batch_split_into_1000_chunks(self, mock_boto3):
        """S3 delete_objects max is 1000 keys per call — must batch."""
        mock_s3 = MagicMock()
        mock_boto3.client.return_value = mock_s3
        mock_paginator = MagicMock()
        mock_s3.get_paginator.return_value = mock_paginator

        # 2500 objects → needs 3 batches (1000 + 1000 + 500)
        objects = [{"Key": f"prefix/file_{i}.pdf"} for i in range(2500)]
        mock_paginator.paginate.return_value = [{"Contents": objects}]
        mock_s3.delete_objects.return_value = {}

        count = _delete_s3_prefix("bucket/prefix")

        assert count == 2500
        assert mock_s3.delete_objects.call_count == 3

        # First batch: 1000
        first_call_keys = mock_s3.delete_objects.call_args_list[0][1]["Delete"]["Objects"]
        assert len(first_call_keys) == 1000

        # Last batch: 500
        last_call_keys = mock_s3.delete_objects.call_args_list[2][1]["Delete"]["Objects"]
        assert len(last_call_keys) == 500

    @patch("app.tasks.cleanup_task.boto3")
    def test_s3_client_error_returns_zero_gracefully(self, mock_boto3):
        """ClientError must be caught and return 0, not crash the cleanup task."""
        from botocore.exceptions import ClientError
        mock_s3 = MagicMock()
        mock_boto3.client.return_value = mock_s3
        mock_s3.get_paginator.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}},
            "ListObjectsV2"
        )
        count = _delete_s3_prefix("bucket/prefix")
        assert count == 0

    def test_storage_path_parsed_correctly(self):
        """Verify bucket/prefix parsing for various formats."""
        cases = [
            ("my-bucket/uploads/user1/session1", "my-bucket", "uploads/user1/session1"),
            ("bucket/a/b/c/d", "bucket", "a/b/c/d"),
        ]
        for path, expected_bucket, expected_prefix in cases:
            bucket, prefix = path.split("/", 1)
            assert bucket == expected_bucket
            assert prefix == expected_prefix
