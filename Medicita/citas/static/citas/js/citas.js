// =============================================
// MEDICITA - WIZARD FUNCIONAL CON DJANGO
// =============================================

document.addEventListener('DOMContentLoaded', function () {
    initWizard();
});

let currentStep = 1;
let selected = {
    especialidad_id: null,
    medico_id: null,
    fecha: null,
    hora: null
};

let especialidadesData = [];
let medicosData = [];
let citasExistentesData = [];

function initWizard() {
    especialidadesData = JSON.parse(document.getElementById('especialidades-data').textContent);
    medicosData = JSON.parse(document.getElementById('medicos-data').textContent);
    citasExistentesData = JSON.parse(document.getElementById('citas-existentes-data').textContent);

    console.log("Especialidades cargadas:", especialidadesData);
    console.log("Médicos cargados:", medicosData);
    console.log("Citas existentes:", citasExistentesData);

    renderEspecialidades();
    initCalendar();
}

function renderEspecialidades() {
    const container = document.getElementById('especialidades-grid');
    if (!container) return;
    container.innerHTML = '';

    if (especialidadesData.length === 0) {
        container.innerHTML = '<p class="text-danger">No hay especialidades registradas en la base de datos.</p>';
        return;
    }

    especialidadesData.forEach(esp => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = `
            <div class="specialty-card h-100" data-id="${esp.id}">
                <i class="fas fa-stethoscope"></i>
                <h6 class="fw-semibold mb-0">${esp.nombre}</h6>
                <div class="check-icon"><i class="fas fa-check fa-sm"></i></div>
            </div>
        `;
        const card = col.querySelector('.specialty-card');
        card.addEventListener('click', () => selectEspecialidad(esp.id, card));
        container.appendChild(col);
    });
}

function selectEspecialidad(id, cardElement) {
    document.querySelectorAll('#especialidades-grid .specialty-card').forEach(c => c.classList.remove('selected'));
    cardElement.classList.add('selected');
    selected.especialidad_id = id;
    document.getElementById('btn-next-1').disabled = false;
}

function renderMedicos(especialidadId) {
    const container = document.getElementById('medicos-list');
    container.innerHTML = '';

    const filtered = medicosData.filter(m => m.especialidad_id == especialidadId);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-warning">No hay médicos para esta especialidad.</p>';
        return;
    }

    filtered.forEach(med => {
        const div = document.createElement('div');
        div.className = 'doctor-card d-flex align-items-center gap-3';
        div.innerHTML = `
            <img src="https://picsum.photos/id/1005/64/64" class="rounded-circle border" width="58" height="58">
            <div class="flex-grow-1">
                <div class="fw-bold">${med.nombre}</div>
                <div class="text-muted small">${med.hospital || ''}</div>
            </div>
        `;
        div.addEventListener('click', () => selectMedico(med.id, div));
        container.appendChild(div);
    });
}

function selectMedico(id, element) {
    document.querySelectorAll('#medicos-list .doctor-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selected.medico_id = id;
    document.getElementById('btn-next-2').disabled = false;
}

// ==================== CALENDARIO ====================
let currentCalendarDate = new Date(2026, 5, 1);

function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const titleEl = document.getElementById('calendar-title');
    if (!grid || !titleEl) return;

    grid.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    days.forEach(d => {
        const header = document.createElement('div');
        header.className = 'text-center fw-bold small text-muted py-1';
        header.textContent = d;
        grid.appendChild(header);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day mx-auto';
        dayEl.textContent = day;

        const isAvailable = day >= 12 && day <= 28 && ![13, 17, 22].includes(day);
        if (isAvailable) {
            dayEl.addEventListener('click', () => selectDate(dateStr, dayEl));
            if (selected.fecha === dateStr) dayEl.classList.add('selected');
        } else {
            dayEl.classList.add('disabled');
        }
        grid.appendChild(dayEl);
    }
}

function selectDate(dateStr, element) {
    document.querySelectorAll('#calendar-grid .calendar-day').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selected.fecha = dateStr;

    const dateObj = new Date(dateStr);
    const formatted = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const resFecha = document.getElementById('res-fecha');
    if (resFecha) resFecha.textContent = formatted;

    document.getElementById('btn-next-3').disabled = false;
}

function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

// ==================== HORARIOS ====================
function renderTimeSlots() {
    const container = document.getElementById('time-slots-grid');
    container.innerHTML = '';

    const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'];
    const occupied = ['09:00', '14:00'];

    times.forEach(time => {
        const btn = document.createElement('button');
        btn.className = `time-slot btn flex-fill`;
        btn.style.minWidth = '72px';
        btn.textContent = time;

        // ¿El paciente ya tiene otra cita activa en esta fecha y hora?
        const conflicto = citasExistentesData.some(c => c.fecha === selected.fecha && c.hora === time);

        if (occupied.includes(time) || conflicto) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            if (conflicto) btn.title = 'Ya tienes una cita agendada a esta hora';
        } else {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#time-slots-grid .time-slot').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selected.hora = time;
                updateFinalSummary();
                document.getElementById('btn-confirmar').disabled = false;
            });
        }
        container.appendChild(btn);
    });
}

function updateFinalSummary() {
    const esp = especialidadesData.find(e => e.id == selected.especialidad_id);
    const med = medicosData.find(m => m.id == selected.medico_id);

    if (esp) document.getElementById('final-esp').textContent = esp.nombre;
    if (med) document.getElementById('final-med').textContent = med.nombre;
    if (selected.fecha) document.getElementById('final-fecha').textContent = new Date(selected.fecha).toLocaleDateString('es-ES');
    if (selected.hora) document.getElementById('final-hora').textContent = selected.hora;
}

// ==================== NAVEGACIÓN ====================
function goToStep(step) {
    if (step === 2 && !selected.especialidad_id) return alert('Selecciona una especialidad');
    if (step === 3 && !selected.medico_id) return alert('Selecciona un médico');
    if (step === 4 && !selected.fecha) return alert('Selecciona una fecha');

    document.querySelectorAll('.step-content').forEach(el => el.classList.add('d-none'));
    document.getElementById(`step-${step}`).classList.remove('d-none');

    document.querySelectorAll('.step').forEach((s, index) => {
        s.classList.remove('active', 'completed');
        if (index + 1 < step) s.classList.add('completed');
        if (index + 1 === step) s.classList.add('active');
    });

    currentStep = step;

    if (step === 2) renderMedicos(selected.especialidad_id);
    if (step === 4) renderTimeSlots();
}

// ==================== CONFIRMAR ====================
async function confirmarCita() {
    if (!selected.especialidad_id || !selected.medico_id || !selected.fecha || !selected.hora) {
        alert('Por favor completa todos los campos');
        return;
    }

    try {
        const response = await fetch('/citas/agendar/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(selected)
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('modal-codigo').textContent = data.codigo || 'MED-00001';
            document.getElementById('modal-doctor').textContent = data.doctor || '';
            document.getElementById('modal-datetime').textContent = `${data.fecha} ${data.hora}`;

            const modal = new bootstrap.Modal(document.getElementById('successModal'));
            modal.show();
        } else {
            alert('Error: ' + (data.error || 'No se pudo confirmar la cita'));
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}