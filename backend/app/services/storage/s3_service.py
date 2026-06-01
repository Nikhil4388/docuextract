"""
Cloud storage integrations: AWS S3, Google Drive, Dropbox.
"""
import os
import tempfile
from typing import List, Optional
import boto3
from botocore.exceptions import ClientError


class S3Service:
    def __init__(self, access_key: str, secret_key: str, region: str = "us-east-1"):
        self.client = boto3.client(
            "s3",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )

    def list_pdfs(self, bucket: str, prefix: str = "") -> List[str]:
        """Return list of PDF S3 keys under a prefix."""
        keys = []
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                if obj["Key"].lower().endswith(".pdf"):
                    keys.append(obj["Key"])
        return keys

    def download_pdf(self, bucket: str, key: str, dest_dir: str) -> str:
        """Download a PDF and return local path."""
        local_path = os.path.join(dest_dir, os.path.basename(key))
        self.client.download_file(bucket, key, local_path)
        return local_path


class GoogleDriveService:
    def __init__(self, credentials_json: dict):
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        creds = Credentials.from_service_account_info(
            credentials_json,
            scopes=["https://www.googleapis.com/auth/drive.readonly"],
        )
        self.service = build("drive", "v3", credentials=creds)

    def list_pdfs(self, folder_id: str) -> List[dict]:
        results = self.service.files().list(
            q=f"'{folder_id}' in parents and mimeType='application/pdf'",
            fields="files(id, name)",
        ).execute()
        return results.get("files", [])

    def download_pdf(self, file_id: str, dest_dir: str, filename: str) -> str:
        from googleapiclient.http import MediaIoBaseDownload
        import io
        request = self.service.files().get_media(fileId=file_id)
        local_path = os.path.join(dest_dir, filename)
        with open(local_path, "wb") as fh:
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
        return local_path


class DropboxService:
    def __init__(self, access_token: str):
        import dropbox
        self.dbx = dropbox.Dropbox(access_token)

    def list_pdfs(self, folder_path: str) -> List[dict]:
        result = self.dbx.files_list_folder(folder_path)
        files = []
        for entry in result.entries:
            if entry.name.lower().endswith(".pdf"):
                files.append({"id": entry.id, "name": entry.name, "path": entry.path_display})
        return files

    def download_pdf(self, path: str, dest_dir: str) -> str:
        import dropbox
        local_path = os.path.join(dest_dir, os.path.basename(path))
        self.dbx.files_download_to_file(local_path, path)
        return local_path


def get_storage_service(provider: str, credentials: dict):
    """Factory for storage services."""
    if provider == "s3":
        return S3Service(
            credentials["access_key"],
            credentials["secret_key"],
            credentials.get("region", "us-east-1"),
        )
    elif provider == "google_drive":
        return GoogleDriveService(credentials)
    elif provider == "dropbox":
        return DropboxService(credentials["access_token"])
    raise ValueError(f"Unknown storage provider: {provider}")
