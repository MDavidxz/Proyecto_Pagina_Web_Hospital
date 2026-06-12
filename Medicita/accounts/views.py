from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import authenticate, login

def login_view(request):
    error_message = None

    if request.method == 'POST':
        # 1. Django atrapa lo que el usuario escribió en el HTML usando los 'name'
        usuario = request.POST.get('username')
        clave = request.POST.get('password')

        # 2. Django busca en la base de datos si ese usuario y contraseña coinciden
        user = authenticate(request, username=usuario, password=clave)

        if user is not None:
            login(request, user) # 3. Si coincide, se inicia la sesión correctamente
            return redirect('citas:home') # 4. Lo mandamos a la página de inicio
        else:
            # Si no coincide, preparamos un mensaje de error
            error_message = "Usuario o contraseña incorrectos."

    return render(request, 'accounts/login.html', {'error': error_message})

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # Inicia sesión automáticamente después de registrarse
            return redirect('citas:home')  # Redirige al inicio después de registrarse
    else:
        form = UserCreationForm()
    
    return render(request, 'accounts/register.html', {'form': form})