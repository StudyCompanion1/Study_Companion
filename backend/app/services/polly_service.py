"""Amazon Polly text-to-speech service."""

import os

import boto3

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
POLLY_VOICE = "Isabelle"
POLLY_ENGINE = "neural"

def synthesize_speech(text: str) -> bytes:
    """Convert text into MP3 audio using Amazon Polly."""

    polly = boto3.client(
        "polly",
        region_name=AWS_REGION,
    )

    response = polly.synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=POLLY_VOICE,
        Engine=POLLY_ENGINE,
    )

    try:
        return response["AudioStream"].read()
    finally:
        response["AudioStream"].close()