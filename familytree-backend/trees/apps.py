from django.apps import AppConfig


class TreesConfig(AppConfig):
    """Конфигурация приложения trees."""
    name = 'trees'

    def ready(self):
        """Подключает обработчики сигналов (trees/signals.py) при старте приложения —
        это стандартное место в Django для регистрации @receiver-обработчиков."""
        from . import signals  # noqa: F401

        # Регистрирует HEIC/HEIF-декодер в Pillow — по умолчанию Pillow не умеет читать
        # этот формат, а это формат фото по умолчанию на iPhone, так что без этого
        # загрузка фото персоны с iPhone падает с "not a valid image".
        from pillow_heif import register_heif_opener
        register_heif_opener()
