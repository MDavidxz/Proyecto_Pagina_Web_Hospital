from django.db import models
from django.contrib.auth.models import User

class Especialidad(models.Model):
    nombre = models.CharField(max_length=100)
    icono = models.CharField(max_length=50, default='fa-stethoscope')

    def __str__(self):
        return self.nombre


class Medico(models.Model):
    nombre = models.CharField(max_length=100)
    especialidad = models.ForeignKey(Especialidad, on_delete=models.CASCADE)
    hospital = models.CharField(max_length=150)
    anos_experiencia = models.IntegerField(default=5)
    foto = models.URLField(blank=True)

    def __str__(self):
        return self.nombre


class Cita(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
    ]
    paciente = models.ForeignKey(User, on_delete=models.CASCADE)
    medico = models.ForeignKey(Medico, on_delete=models.CASCADE)
    especialidad = models.ForeignKey(Especialidad, on_delete=models.CASCADE)
    fecha = models.DateField()
    hora = models.CharField(max_length=5)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='confirmada')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.paciente} - {self.medico} ({self.fecha})"

# =============================================
# MODELO DE CONVERSACIÓN (Chat entre paciente y médico)
# =============================================
class Conversation(models.Model):
    paciente = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='paciente_conversations'
    )
    medico = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='medico_conversations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('paciente', 'medico')
        ordering = ['-last_message_at']

    def __str__(self):
        return f"Chat: {self.paciente.username} - {self.medico.username}"


# =============================================
# MODELO DE MENSAJE
# =============================================
class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"


# =============================================
# MODELO DE PERFIL DE USUARIO
# =============================================
class Profile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    phone = models.CharField(max_length=20, blank=True)
    cedula = models.CharField(max_length=20, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    pais = models.CharField(max_length=100, blank=True)
    codigo_postal = models.CharField(max_length=20, blank=True)
    genero = models.CharField(max_length=20, blank=True)
    photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    contacto_emergencia = models.CharField(max_length=150, blank=True)
    numero_emergencia = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Perfil de {self.user.username}"