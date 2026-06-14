// =============================================
// MEDICITA - EDITAR CITA (especialidad -> médico -> fecha -> hora)
// =============================================

const TIEMPOS_DISPONIBLES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
                              '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'];
const HORAS_OCUPADAS = ['09:00', '14:00'];

let especialidadesData = [];
let medicosData = [];
let citasExistentes = [];
let selected = {};
let currentCalendarDateEdit;

document.addEventListener('DOMContentLoaded', function () {
    especialidadesData = JSON.parse(document.getElementById('especialidades-data').textContent);
    medicosData = JSON.parse(document.getElementById('medicos-data').textContent);
    citasExistentes = JSON.parse(document.getElementById('citas-existentes-data').textContent);

    selected = {
        especialidad_id: citaActual.especialidad_id,
        medico_id: citaActual.medico_id,
        fecha: citaActual.fecha,
        hora: citaActual.hora
    };

    renderMedicosSelect(selected.especialidad_id, selected.medico_id);

    document.getElementById('select-especialidad').addEventListener('change', function (e) {
        const espId = parseInt(e.target.value);
        selected.especialidad_id = espId;
        document.getElementById('input-especialidad').value = espId;
        renderMedicosSelect(espId, null);
    });

    document.getElementById('select-medico').addEventListener('change', function (e) {
        selected.medico_id = parseInt(e.target.value);
        document.getElementById('input-medico').value = selected.medico_id;
    });

    const [y, m] = citaActual.fecha.split('-').map(Number);
    currentCalendarDateEdit = new Date(y, m - 1, 1);

    renderCalendarEdit();
    renderTimeSlotsEdit();
});

// ==================== MÉDICOS POR ESPECIALIDAD ====================
function renderMedicosSelect(especialidadId, medicoIdToSelect) {
    const select = document.getElementById('select-medico');
    select.innerHTML = '';

    const filtered = medicosData.filter(m => m.especialidad_id == especialidadId);

    if (filtered.length === 0) {
        select.innerHTML = '<option value="">No hay médicos disponibles</option>';
        selected.medico_id = null;
        document.getElementById('input-medico').value = '';
        return;
    }

    filtered.forEach(med => {
        const opt = document.createElement('option');
        opt.value = med.id;
        opt.textContent = `Dr. ${med.nombre}`;
        select.appendChild(opt);
    });

    let medicoFinal = filtered.find(m => m.id == medicoIdToSelect);
    if (!medicoFinal) medicoFinal = filtered[0];

    select.value = medicoFinal.id;
    selected.medico_id = medicoFinal.id;
    document.getElementById('input-medico').value = medicoFinal.id;
}

// ==================== CALENDARIO ====================
function renderCalendarEdit() {
    const grid = document.getElementById('calendar-grid-edit');
    const titleEl = document.getElementById('calendar-title-edit');
    if (!grid || !titleEl) return;

    grid.innerHTML = '';
    const year = currentCalendarDateEdit.getFullYear();
    const month = currentCalendarDateEdit.getMonth();

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    const days = ['L','M','M','J','V','S','D'];
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
            dayEl.addEventListener('click', () => selectDateEdit(dateStr, dayEl));
            if (selected.fecha === dateStr) dayEl.classList.add('selected');
        } else {
            dayEl.classList.add('disabled');
        }
        grid.appendChild(dayEl);
    }
}

function selectDateEdit(dateStr, element) {
    document.querySelectorAll('#calendar-grid-edit .calendar-day').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selected.fecha = dateStr;
    document.getElementById('input-fecha').value = dateStr;

    // Si cambia la fecha, hay que volver a elegir la hora
    if (dateStr !== citaActual.fecha) {
        selected.hora = null;
        document.getElementById('input-hora').value = '';
    } else {
        selected.hora = citaActual.hora;
        document.getElementById('input-hora').value = citaActual.hora;
    }

    const dateObj = new Date(dateStr + 'T00:00:00');
    const formatted = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('fecha-seleccionada-info').textContent = `Fecha seleccionada: ${formatted}`;

    renderTimeSlotsEdit();
}

function prevMonthEdit() {
    currentCalendarDateEdit.setMonth(currentCalendarDateEdit.getMonth() - 1);
    renderCalendarEdit();
}

function nextMonthEdit() {
    currentCalendarDateEdit.setMonth(currentCalendarDateEdit.getMonth() + 1);
    renderCalendarEdit();
}

// ==================== HORARIOS ====================
function renderTimeSlotsEdit() {
    const container = document.getElementById('time-slots-grid-edit');
    container.innerHTML = '';

    TIEMPOS_DISPONIBLES.forEach(time => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-slot btn flex-fill';
        btn.style.minWidth = '72px';
        btn.textContent = time;

        // La hora actual de ESTA cita sigue disponible para ella misma,
        // solo si seguimos en la misma fecha original
        const esHoraPropiaActual = (selected.fecha === citaActual.fecha && time === citaActual.hora);

        const horaFija = HORAS_OCUPADAS.includes(time);
        const conflicto = citasExistentes.some(c => c.fecha === selected.fecha && c.hora === time);

        const ocupado = (horaFija || conflicto) && !esHoraPropiaActual;

        if (ocupado) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            if (conflicto) btn.title = 'Ya tienes otra cita a esta hora';
        } else {
            if (selected.hora === time) btn.classList.add('selected');
            btn.addEventListener('click', () => {
                document.querySelectorAll('#time-slots-grid-edit .time-slot').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selected.hora = time;
                document.getElementById('input-hora').value = time;
            });
        }
        container.appendChild(btn);
    });
}