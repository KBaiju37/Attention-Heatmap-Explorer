import io

import pytest
from PIL import Image

from app.core.exceptions import InvalidImageError
from app.vision.images import open_valid_image


def make_image_bytes(image_format: str = "PNG") -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 6), color=(40, 80, 120)).save(buffer, format=image_format)
    return buffer.getvalue()


def test_open_valid_image_decodes_supported_file_as_rgb() -> None:
    image = open_valid_image(make_image_bytes("JPEG"))

    assert image.mode == "RGB"
    assert image.size == (8, 6)


@pytest.mark.parametrize(
    "data",
    [
        b"",
        b"not an image",
        make_image_bytes("GIF"),
    ],
)
def test_open_valid_image_rejects_empty_invalid_and_unsupported_files(data: bytes) -> None:
    with pytest.raises(InvalidImageError):
        open_valid_image(data)


def test_open_valid_image_rejects_oversized_data() -> None:
    with pytest.raises(InvalidImageError, match="upload limit"):
        open_valid_image(b"x" * (5 * 1024 * 1024 + 1))
