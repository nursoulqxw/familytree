from django.apps import AppConfig


class TreesConfig(AppConfig):
    name = 'trees'

    def ready(self):
        from . import signals  # noqa: F401
