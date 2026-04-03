import logging
from pathlib import Path


class Logger:
    """Project-wide logger wrapper."""

    def __init__(
        self,
        name: str = "multi-agent-s2c",
        level: int = logging.INFO,
        log_file: str | None = None,
    ) -> None:
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)

        if self.logger.handlers:
            return

        formatter = logging.Formatter(
            "%(asctime)s | %(name)s | %(levelname)s | %(filename)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        stream_handler = logging.StreamHandler()
        stream_handler.setLevel(level)
        stream_handler.setFormatter(formatter)
        self.logger.addHandler(stream_handler)

        if log_file:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(log_path, encoding="utf-8")
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

        self.logger.propagate = False

    @staticmethod
    def _with_stacklevel(kwargs: dict) -> dict:
        payload = dict(kwargs)
        payload["stacklevel"] = payload.get("stacklevel", 2)
        return payload

    def debug(self, message: str) -> None:
        self.logger.debug(message, **self._with_stacklevel({}))

    def info(self, message: str) -> None:
        self.logger.info(message, **self._with_stacklevel({}))

    def warning(self, message: str) -> None:
        self.logger.warning(message, **self._with_stacklevel({}))

    def error(self, message: str) -> None:
        self.logger.error(message, **self._with_stacklevel({}))

    def exception(self, message: str) -> None:
        self.logger.exception(message, **self._with_stacklevel({}))

    def critical(self, message: str) -> None:
        self.logger.critical(message, **self._with_stacklevel({}))


Log = Logger
logger = Logger(name="s2c")
