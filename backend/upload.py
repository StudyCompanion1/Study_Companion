import os
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def upload_file_to_s3(local_file_path: str, object_name: str = None) -> bool:
    """
    Uploads a local file to an AWS S3 bucket.
    
    :param local_file_path: Path to the file on your local system/server
    :param object_name: S3 object name (destination path inside the bucket). 
                        If not specified, local_file_path's filename is used.
    :return: True if upload was successful, else False
    """
    # 1. Grab configuration from environment variables (currently placeholders)
    bucket_name = os.environ.get("AWS_S3_BUCKET_NAME")
    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    aws_region = os.environ.get("AWS_REGION", "us-east-1") # default fallback
    
    # If no object name was specified, use the file name
    if object_name is None:
        object_name = os.path.basename(local_file_path)

    try:
        # 2. Initialize the S3 client with credentials
        s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=aws_region
        )
        
        # 3. Perform the upload
        print(f"Uploading {local_file_path} to s3://{bucket_name}/{object_name}...")
        s3_client.upload_file(local_file_path, bucket_name, object_name)
        
        print("Upload successful!")
        return True

    except FileNotFoundError:
        print(f"The local file at {local_file_path} was not found.")
        return False
    except NoCredentialsError:
        print("AWS credentials not found or incomplete.")
        return False
    except ClientError as e:
        print(f"AWS S3 Client Error: {e}")
        return False
