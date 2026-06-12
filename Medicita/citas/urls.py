from django.urls import path
from . import views

app_name = 'citas'

urlpatterns = [
    path('agendar/', views.agendar_cita, name='agendar_cita'),
    path('inicio/', views.home, name='home'),
    path('chat/', views.chat_view, name='chat'),           
    path('perfil/', views.perfil, name='perfil'),
    path('mis-citas/', views.mis_citas, name='mis_citas'),
    path('editar-cita/<int:cita_id>/', views.editar_cita, name='editar_cita'),
    path('cancelar-cita/<int:cita_id>/', views.cancelar_cita, name='cancelar_cita'),
]