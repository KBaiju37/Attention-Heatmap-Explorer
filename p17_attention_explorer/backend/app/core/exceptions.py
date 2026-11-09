class ModelLoadError(RuntimeError):
    """A requested model could not be loaded from its local cache or the Hub."""


class InvalidImageError(ValueError):
    """An uploaded image is invalid or unsupported."""
