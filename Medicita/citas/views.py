from django.shortcuts import redirect, render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
import json

from .models import Especialidad, Medico, Cita, Conversation, Message, Profile


# ==================== VISTA DE AGENDAR CITA ====================
@login_required
def agendar_cita(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            especialidad_id = data.get('especialidad_id')
            medico_id = data.get('medico_id')
            fecha = data.get('fecha')
            hora = data.get('hora')

            if not all([especialidad_id, medico_id, fecha, hora]):
                return JsonResponse({
                    "success": False,
                    "error": "Faltan datos obligatorios"
                }, status=400)

            especialidad = Especialidad.objects.get(id=especialidad_id)
            medico = Medico.objects.get(id=medico_id)

            cita = Cita.objects.create(
                paciente=request.user,
                medico=medico,
                especialidad=especialidad,
                fecha=fecha,
                hora=hora,
                estado='confirmada'
            )

            return JsonResponse({
                "success": True,
                "codigo": f"MED-{cita.id:05d}",
                "doctor": medico.nombre,
                "fecha": fecha,
                "hora": hora
            })

        except Especialidad.DoesNotExist:
            return JsonResponse({"success": False, "error": "La especialidad seleccionada no existe."}, status=400)
        except Medico.DoesNotExist:
            return JsonResponse({"success": False, "error": "El médico seleccionado no existe."}, status=400)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    especialidades = list(Especialidad.objects.values('id', 'nombre'))
    medicos = list(Medico.objects.values('id', 'nombre', 'especialidad_id', 'hospital', 'anos_experiencia'))

    context = {
        'especialidades': especialidades,
        'medicos': medicos,
    }
    return render(request, 'citas/agendar_cita.html', context)


# ==================== VISTA DE INICIO ====================
@login_required
def home(request):
    user = request.user

    proxima_cita = Cita.objects.filter(
        paciente=user,
        estado__in=['pendiente', 'confirmada']
    ).order_by('fecha', 'hora').first()

    mensajes_nuevos = Message.objects.filter(
        conversation__paciente=user
    ).exclude(sender=user).count()

    historial_count = Cita.objects.filter(
        paciente=user,
        estado='confirmada'
    ).count()

    context = {
        'proxima_cita': proxima_cita,
        'mensajes_nuevos': mensajes_nuevos,
        'historial_count': historial_count,
    }
    return render(request, 'citas/home.html', context)


# ==================== VISTA DE MIS CITAS ====================
@login_required
def mis_citas(request):
    citas = Cita.objects.filter(paciente=request.user).order_by('-fecha', '-hora')
    return render(request, 'citas/mis_citas.html', {'citas': citas})


# ==================== EDITAR CITA (Mejorada) ====================
@login_required
def editar_cita(request, cita_id):
    cita = get_object_or_404(Cita, id=cita_id, paciente=request.user)

    if request.method == 'POST':
        cita.fecha = request.POST.get('fecha')
        cita.hora = request.POST.get('hora')
        
        # Cambiar médico si se selecciona uno diferente
        medico_id = request.POST.get('medico_id')
        if medico_id:
            cita.medico = get_object_or_404(Medico, id=medico_id)
        
        cita.save()
        messages.success(request, 'Cita actualizada correctamente.')
        return redirect('citas:mis_citas')

    # Pasar lista de médicos para poder cambiar de doctor
    medicos = Medico.objects.all()
    context = {
        'cita': cita,
        'medicos': medicos
    }
    return render(request, 'citas/editar_cita.html', context)


# ==================== CANCELAR / ELIMINAR CITA ====================
@login_required
def cancelar_cita(request, cita_id):
    cita = get_object_or_404(Cita, id=cita_id, paciente=request.user)
    cita.delete()                     # ← Elimina completamente la cita
    messages.success(request, 'Cita eliminada correctamente.')
    return redirect('citas:mis_citas')


# ==================== VISTA DE CHAT ====================
@login_required
def chat_view(request):
    user = request.user

    conversations = Conversation.objects.filter(
        paciente=user
    ) | Conversation.objects.filter(
        medico=user
    )
    conversations = conversations.distinct().order_by('-last_message_at')

    if user.is_staff:
        conversations = conversations.filter(messages__isnull=False)

    selected_conversation = None
    chat_messages = []
    other_user = None
    selected_medico = None
    medicos = None

    conversation_id = request.GET.get('conversation')
    medico_id = request.GET.get('medico')

    if conversation_id:
        try:
            selected_conversation = conversations.get(id=conversation_id)
            chat_messages = selected_conversation.messages.all().order_by('timestamp')

            if selected_conversation.paciente == user:
                other_user = selected_conversation.medico
            else:
                other_user = selected_conversation.paciente

        except Conversation.DoesNotExist:
            pass

    elif medico_id and not user.is_staff:
        try:
            selected_medico = User.objects.get(id=medico_id, is_staff=True)
            selected_conversation, created = Conversation.objects.get_or_create(
                paciente=user,
                medico=selected_medico
            )
            chat_messages = selected_conversation.messages.all().order_by('timestamp')
            other_user = selected_medico
        except User.DoesNotExist:
            pass

    if not user.is_staff:
        medicos = User.objects.filter(is_staff=True).exclude(id=user.id)

    if request.method == 'POST' and selected_conversation:
        content = request.POST.get('content', '').strip()
        if content:
            Message.objects.create(
                conversation=selected_conversation,
                sender=user,
                content=content
            )
            selected_conversation.save()

            if user.is_staff:
                return redirect(f"{request.path}?conversation={selected_conversation.id}")
            else:
                medico_redirect = selected_medico.id if selected_medico else selected_conversation.medico.id
                return redirect(f"{request.path}?medico={medico_redirect}")

    context = {
        'conversations': conversations,
        'selected_conversation': selected_conversation,
        'messages': chat_messages,
        'other_user': other_user,
        'user_is_staff': user.is_staff,
        'medicos': medicos,
        'selected_medico': selected_medico,
    }
    return render(request, 'citas/chat.html', context)


# ==================== VISTA DE PERFIL ====================
@login_required
def perfil(request):
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        request.user.first_name = request.POST.get('first_name', request.user.first_name)
        request.user.last_name = request.POST.get('last_name', request.user.last_name)
        request.user.email = request.POST.get('email', request.user.email)
        request.user.save()

        profile.phone = request.POST.get('phone', profile.phone)
        profile.cedula = request.POST.get('cedula', profile.cedula)
        profile.fecha_nacimiento = request.POST.get('fecha_nacimiento') or profile.fecha_nacimiento
        profile.genero = request.POST.get('genero', profile.genero)
        profile.direccion = request.POST.get('direccion', profile.direccion)
        profile.ciudad = request.POST.get('ciudad', profile.ciudad)
        profile.pais = request.POST.get('pais', profile.pais)
        profile.codigo_postal = request.POST.get('codigo_postal', profile.codigo_postal)

        if 'photo' in request.FILES:
            profile.photo = request.FILES['photo']

        profile.save()
        messages.success(request, 'Perfil actualizado correctamente.')
        return redirect('citas:perfil')

    context = {
        'user': request.user,
        'profile': profile
    }
    return render(request, 'citas/perfil.html', context)