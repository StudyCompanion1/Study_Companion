"""F1 Upload material — copies an incoming upload to a temporary file on the server.

router.py calls save_to_temp() first, so the file is checked (size, not empty) before it is
stored for good with app/storage.py. The caller deletes the temp file when it is done.
"""

import os
import tempfile

from fastapi import HTTPException, UploadFile, status

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB, the same limit the frontend checks (materials/api.ts)
CHUNK_BYTES = 1024 * 1024  # read 1 MB at a time


async def save_to_temp(file: UploadFile, extension: str) -> str:
    """Write the upload to a temp file and return its path.

    Raises 413 if the file is over MAX_UPLOAD_BYTES and 400 if it is empty. Reading in chunks
    means a huge file is rejected without the whole thing ever being held in memory.
    """
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
    try:
        with temp:  # closes the file before we return or delete it (Windows can't delete open files)
            total = 0
            while chunk := await file.read(CHUNK_BYTES):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, detail="File exceeds the 25 MB upload limit.")
                temp.write(chunk)
        if total == 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This file is empty.")
    except HTTPException:
        os.remove(temp.name)  # nothing is kept from a rejected upload
        raise
    return temp.name
