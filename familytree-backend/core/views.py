from django.shortcuts import render


def dev_console(request):
    """Мини-консоль для ручного тестирования API без фронтенда (только для DEBUG)."""
    return render(request, 'core/dev_console.html')
