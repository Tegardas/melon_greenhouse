// ====================================================================
// MQTT CONFIGURATION
// ====================================================================
const MQTT_CONFIG = {
    broker: 'wss://broker.avisha.id:8084/mqtt',
    username: 'RizkinK_1234',
    password: 'rizkink1234',
    topics: {
        masterStatus: 'RizkinK_1234/melon/master/status',
        mixingStatus: 'RizkinK_1234/melon/mixing/status',
        wateringStatus: 'RizkinK_1234/melon/watering/status',
        gh1Sensor: 'RizkinK_1234/melon/gh1/sensor',
        gh2Sensor: 'RizkinK_1234/melon/gh2/sensor',
        alerts: 'RizkinK_1234/melon/alerts',
        waterLevel: 'RizkinK_1234/melon/water_level',
        ecCorrection: 'RizkinK_1234/melon/ec_correction',
        scheduleUpdate: 'RizkinK_1234/melon/watering/schedule_update',
        control: 'RizkinK_1234/melon/control/',
        gh_mode: 'RizkinK_1234/melon/control/gh_mode',
        plantingDatetopic: 'RizkinK_1234/melon/planting_date',
        configParams: 'RizkinK_1234/melon/config/parameters'
    }
};

// ====================================================================
// LOCALSTORAGE KEYS
// ====================================================================
const STORAGE_KEYS = {
    PLANTING_DATE: 'melon_planting_date',
    PLANTING_TIME: 'melon_planting_time',
    GH_MODE: 'melon_gh_mode',
    AUTO_MODE: 'melon_auto_mode',
    TARGET_EC: 'melon_target_ec',
    MIX_VOLUME: 'melon_mix_volume',
    WATER_VOLUME: 'melon_water_volume'
};

// ====================================================================
// GLOBAL VARIABLES
// ====================================================================
let mqttClient = null;
let currentGhMode = 0;
let currentPlantingDate = null;
let lastData = {
    master: null,
    gh1: null,
    gh2: null,
    mixing: null,
    waterLevel: null
};

// ====================================================================
// LOCALSTORAGE FUNCTIONS
// ====================================================================
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch(e) {
        console.log('LocalStorage error:', e);
    }
}

function loadFromLocalStorage(key, defaultValue) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
    } catch(e) {
        console.log('LocalStorage error:', e);
        return defaultValue;
    }
}

function saveGhMode(mode) {
    saveToLocalStorage(STORAGE_KEYS.GH_MODE, mode);
}

function saveAutoMode(enabled) {
    saveToLocalStorage(STORAGE_KEYS.AUTO_MODE, enabled);
}

function saveTargetEC(value) {
    saveToLocalStorage(STORAGE_KEYS.TARGET_EC, value);
}

function saveMixVolume(value) {
    saveToLocalStorage(STORAGE_KEYS.MIX_VOLUME, value);
}

function saveWaterVolume(value) {
    saveToLocalStorage(STORAGE_KEYS.WATER_VOLUME, value);
}

function loadConfigFromLocalStorage() {
    const gh1 = loadFromLocalStorage('config_gh1_plants', '336');
    const gh2 = loadFromLocalStorage('config_gh2_plants', '336');
    const nutA = loadFromLocalStorage('config_nutA_conc', '100');
    const nutB = loadFromLocalStorage('config_nutB_conc', '100');
    const ppmFact = loadFromLocalStorage('config_ppm_factor', '500');
    const tankCap = loadFromLocalStorage('config_tank_capacity', '200');
    
    document.getElementById('plantCountGH1').value = gh1;
    document.getElementById('plantCountGH2').value = gh2;
    document.getElementById('nutrientAConc').value = nutA;
    document.getElementById('nutrientBConc').value = nutB;
    document.getElementById('ppmFactor').value = ppmFact;
    document.getElementById('tankCapacity').value = tankCap;
}

function saveConfigToLocalStorage() {
    saveToLocalStorage('config_gh1_plants', document.getElementById('plantCountGH1').value);
    saveToLocalStorage('config_gh2_plants', document.getElementById('plantCountGH2').value);
    saveToLocalStorage('config_nutA_conc', document.getElementById('nutrientAConc').value);
    saveToLocalStorage('config_nutB_conc', document.getElementById('nutrientBConc').value);
    saveToLocalStorage('config_ppm_factor', document.getElementById('ppmFactor').value);
    saveToLocalStorage('config_tank_capacity', document.getElementById('tankCapacity').value);
}

// ====================================================================
// UI UPDATE FUNCTIONS
// ====================================================================
function updateGhModeUI(mode) {
    currentGhMode = mode;
    
    const btnBoth = document.getElementById('ghModeBoth');
    const btn1 = document.getElementById('ghMode1');
    const btn2 = document.getElementById('ghMode2');
    
    if (btnBoth) btnBoth.classList.remove('active');
    if (btn1) btn1.classList.remove('active');
    if (btn2) btn2.classList.remove('active');
    
    let modeText = '';
    if (mode == 0) {
        if (btnBoth) btnBoth.classList.add('active');
        modeText = 'Keduanya (GH1 & GH2)';
    } else if (mode == 1) {
        if (btn1) btn1.classList.add('active');
        modeText = 'GH1 Saja';
    } else if (mode == 2) {
        if (btn2) btn2.classList.add('active');
        modeText = 'GH2 Saja';
    }
    
    const currentGhModeEl = document.getElementById('currentGhMode');
    if (currentGhModeEl) currentGhModeEl.textContent = modeText;
}

// ====================================================================
// LOAD ALL SETTINGS
// ====================================================================
function loadAllSettings() {
    // GH Mode
    const savedGhMode = loadFromLocalStorage(STORAGE_KEYS.GH_MODE, '0');
    updateGhModeUI(parseInt(savedGhMode));
    
    // Auto Mode
    const savedAutoMode = loadFromLocalStorage(STORAGE_KEYS.AUTO_MODE, 'true');
    const autoToggle = document.getElementById('autoModeToggle');
    const autoStatus = document.getElementById('autoModeStatus');
    if (autoToggle) {
        const isEnabled = savedAutoMode === 'true';
        autoToggle.checked = isEnabled;
        if (autoStatus) autoStatus.textContent = isEnabled ? 'ON' : 'OFF';
    }
    
    // Target EC
    const savedTargetEC = loadFromLocalStorage(STORAGE_KEYS.TARGET_EC, '1.8');
    const targetECInput = document.getElementById('targetEC');
    if (targetECInput) targetECInput.value = savedTargetEC;
    
    // Mix Volume
    const savedMixVolume = loadFromLocalStorage(STORAGE_KEYS.MIX_VOLUME, '100');
    const mixVolumeInput = document.getElementById('mixVolume');
    if (mixVolumeInput) mixVolumeInput.value = savedMixVolume;
    
    // Water Volume
    const savedWaterVolume = loadFromLocalStorage(STORAGE_KEYS.WATER_VOLUME, '800');
    const waterVolumeInput = document.getElementById('waterPlantVolume');
    if (waterVolumeInput) waterVolumeInput.value = savedWaterVolume;
}

// ====================================================================
// PLANTING DATE FUNCTIONS
// ====================================================================
function initPlantingDate() {
    const savedDate = localStorage.getItem(STORAGE_KEYS.PLANTING_DATE);
    const savedTime = localStorage.getItem(STORAGE_KEYS.PLANTING_TIME);
    
    const dateInput = document.getElementById('plantingDateInput');
    const timeInput = document.getElementById('plantingTimeInput');
    
    if (savedDate && savedTime && dateInput && timeInput) {
        dateInput.value = savedDate;
        timeInput.value = savedTime;
        currentPlantingDate = `${savedDate} ${savedTime}`;
        updatePlantingDisplay(savedDate, savedTime);
    } else if (dateInput && timeInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const seconds = String(today.getSeconds()).padStart(2, '0');
        
        const defaultDate = `${year}-${month}-${day}`;
        const defaultTime = `${hours}:${minutes}:${seconds}`;
        
        dateInput.value = defaultDate;
        timeInput.value = defaultTime;
        currentPlantingDate = `${defaultDate} ${defaultTime}`;
        updatePlantingDisplay(defaultDate, defaultTime);
        
        saveToLocalStorage(STORAGE_KEYS.PLANTING_DATE, defaultDate);
        saveToLocalStorage(STORAGE_KEYS.PLANTING_TIME, defaultTime);
    }
}

function updatePlantingDisplay(date, time) {
    const plantingDateEl = document.getElementById('plantingDateValue');
    const daysSinceEl = document.getElementById('daysSincePlanting');
    
    if (plantingDateEl && date) {
        const [year, month, day] = date.split('-');
        const dateObj = new Date(year, month - 1, day);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        plantingDateEl.textContent = `${dateObj.toLocaleDateString('id-ID', options)} ${time || '00:00:00'}`;
    }
    
    if (daysSinceEl && date && time) {
        const plantingDateTime = new Date(`${date}T${time || '00:00:00'}`);
        const now = new Date();
        const diffTime = now - plantingDateTime;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0) {
            daysSinceEl.textContent = `${diffDays} hari`;
            daysSinceEl.style.color = 'var(--success)';
        } else {
            daysSinceEl.textContent = `${Math.abs(diffDays)} hari lagi (belum tanam)`;
            daysSinceEl.style.color = 'var(--warning)';
        }
    }
}

function updatePlantingDateFromMQTT(data) {
    console.log('Received planting date from ESP32:', data);
    
    // Format data dari ESP32: { status, year, month, day, hour, minute, second }
    if (data.year !== undefined && data.month !== undefined && data.day !== undefined) {
        const plantingDate = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
        const plantingTime = `${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}:${String(data.second).padStart(2, '0')}`;
        
        // Simpan ke localStorage
        saveToLocalStorage(STORAGE_KEYS.PLANTING_DATE, plantingDate);
        saveToLocalStorage(STORAGE_KEYS.PLANTING_TIME, plantingTime);
        currentPlantingDate = `${plantingDate} ${plantingTime}`;
        
        // Update input fields
        const dateInput = document.getElementById('plantingDateInput');
        const timeInput = document.getElementById('plantingTimeInput');
        if (dateInput) dateInput.value = plantingDate;
        if (timeInput) timeInput.value = plantingTime;
        
        // Update tampilan
        updatePlantingDisplay(plantingDate, plantingTime);
        addAlert('success', `Tanggal tanam disinkronkan dari ESP32: ${plantingDate} ${plantingTime}`);
    }
    // Format alternatif: planting_date & planting_time
    else if (data.planting_date && data.planting_time) {
        saveToLocalStorage(STORAGE_KEYS.PLANTING_DATE, data.planting_date);
        saveToLocalStorage(STORAGE_KEYS.PLANTING_TIME, data.planting_time);
        currentPlantingDate = `${data.planting_date} ${data.planting_time}`;
        
        const dateInput = document.getElementById('plantingDateInput');
        const timeInput = document.getElementById('plantingTimeInput');
        if (dateInput) dateInput.value = data.planting_date;
        if (timeInput) timeInput.value = data.planting_time;
        
        updatePlantingDisplay(data.planting_date, data.planting_time);
        addAlert('success', `Tanggal tanam disinkronkan dari ESP32: ${data.planting_date} ${data.planting_time}`);
    }
    // Format datetime string
    else if (data.datetime) {
        const parts = data.datetime.split(' ');
        if (parts.length >= 2) {
            updatePlantingDateFromMQTT({ planting_date: parts[0], planting_time: parts[1] });
        }
    }
}

function sendPlantingDate() {
    if (!mqttClient || !mqttClient.connected) {
        addAlert('danger', 'Tidak terhubung ke MQTT broker!');
        return;
    }
    
    const dateInput = document.getElementById('plantingDateInput');
    const timeInput = document.getElementById('plantingTimeInput');
    
    if (!dateInput || !timeInput) return;
    
    const plantingDate = dateInput.value;
    const plantingTime = timeInput.value;
    
    if (!plantingDate) {
        addAlert('danger', 'Tanggal tanam tidak valid!');
        return;
    }
    
    const fullDateTime = `${plantingDate} ${plantingTime || '00:00:00'}`;
    currentPlantingDate = fullDateTime;
    
    saveToLocalStorage(STORAGE_KEYS.PLANTING_DATE, plantingDate);
    saveToLocalStorage(STORAGE_KEYS.PLANTING_TIME, plantingTime || '00:00:00');
    updatePlantingDisplay(plantingDate, plantingTime || '00:00:00');
    
    const payload = JSON.stringify({
        planting_date: plantingDate,
        planting_time: plantingTime || '00:00:00',
        datetime: fullDateTime,
        timestamp: Date.now()
    });
    
    mqttClient.publish(MQTT_CONFIG.topics.plantingDate, payload, (err) => {
        if (err) {
            addAlert('danger', 'Gagal mengirim tanggal tanam');
        } else {
            addAlert('success', `Tanggal tanam disimpan: ${fullDateTime}`);
        }
    });
}

function sendConfigToMQTT() {
    if (!mqttClient || !mqttClient.connected) {
        addAlert('danger', 'MQTT tidak terhubung');
        return;
    }
    const payload = {
        gh1_plants: parseInt(document.getElementById('plantCountGH1').value),
        gh2_plants: parseInt(document.getElementById('plantCountGH2').value),
        nutrient_a_conc: parseFloat(document.getElementById('nutrientAConc').value),
        nutrient_b_conc: parseFloat(document.getElementById('nutrientBConc').value),
        ppm_factor: parseInt(document.getElementById('ppmFactor').value),
        tank_capacity: parseFloat(document.getElementById('tankCapacity').value),
        timestamp: Date.now()
    };
    mqttClient.publish(MQTT_CONFIG.topics.configParams, JSON.stringify(payload), (err) => {
        if (err) addAlert('danger', 'Gagal kirim konfigurasi');
        else addAlert('success', 'Konfigurasi terkirim ke ESP32');
    });
    saveConfigToLocalStorage();
}

// ====================================================================
// GH MODE FUNCTIONS
// ====================================================================
function setGhMode(mode) {
    updateGhModeUI(mode);
    saveGhMode(mode);
    
    if (mqttClient && mqttClient.connected) {
        mqttClient.publish(MQTT_CONFIG.topics.gh_mode, JSON.stringify({ mode: mode }));
    }
    
    let modeText = mode == 0 ? 'Keduanya' : (mode == 1 ? 'GH1 Saja' : 'GH2 Saja');
    addAlert('info', `Mode penyiraman diubah: ${modeText}`);
}

function updateGhMode(mode) {
    if (mode === undefined) return;
    updateGhModeUI(mode);
    saveGhMode(mode);
}

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================
function getWaterVolume() {
    const input = document.getElementById('waterPlantVolume');
    if (!input) return 800;
    let volume = parseFloat(input.value);
    if (isNaN(volume) || volume <= 0) return 800;
    return volume;
}

function addAlert(level, message) {
    const alertList = document.getElementById('alertList');
    if (!alertList) return;
    
    const time = new Date().toLocaleTimeString('id-ID');
    const icons = {
        warning: 'fa-exclamation-triangle',
        danger: 'fa-skull-crosswalk',
        info: 'fa-info-circle',
        success: 'fa-check-circle'
    };
    
    const alertHtml = `<div class="alert-item ${level}"><div class="alert-icon"><i class="fas ${icons[level] || 'fa-bell'}"></i></div><div class="alert-message">${message}</div><div class="alert-time">${time}</div></div>`;
    
    if (alertList.querySelector('.alert-placeholder')) alertList.innerHTML = '';
    alertList.insertAdjacentHTML('afterbegin', alertHtml);
    while (alertList.children.length > 20) alertList.removeChild(alertList.lastChild);
}

function publishCommand(command, value) {
    if (!mqttClient || !mqttClient.connected) {
        addAlert('danger', 'Tidak terhubung ke MQTT broker!');
        return;
    }
    
    let topic = `${MQTT_CONFIG.topics.control}${command}`;
    let message = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    mqttClient.publish(topic, message, (err) => {
        if (err) {
            console.error('Publish error:', err);
            addAlert('danger', `Gagal mengirim perintah: ${command}`);
        } else {
            console.log(`Command sent: ${command} -> ${message}`);
        }
    });
}

// ====================================================================
// DATE TIME FUNCTIONS
// ====================================================================
function initDateTime() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const datetimeEl = document.getElementById('datetime');
    if (datetimeEl) {
        datetimeEl.innerHTML = `<i class="far fa-calendar-alt"></i><span>${now.toLocaleDateString('id-ID', options)}</span>`;
    }
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) lastUpdateEl.textContent = now.toLocaleTimeString('id-ID');
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) lastUpdateEl.textContent = now.toLocaleTimeString('id-ID');
    }, 1000);
}

function updateConnectionStatus(status, text) {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;
    statusEl.className = `connection-status ${status}`;
    statusEl.innerHTML = `<i class="fas ${status === 'connected' ? 'fa-plug' : (status === 'connecting' ? 'fa-spinner fa-pulse' : 'fa-exclamation-triangle')}"></i><span>${text}</span>`;
}

// ====================================================================
// MQTT CALLBACK HANDLERS
// ====================================================================
function updateMasterStatus(data) {
    lastData.master = data;
    
    const phaseValue = document.getElementById('phaseValue');
    const phaseDay = document.getElementById('phaseDay');
    const ecValue = document.getElementById('ecValue');
    const ecTarget = document.getElementById('ecTarget');
    const wateringCount = document.getElementById('wateringCount');
    const wateringLimit = document.getElementById('wateringLimit');
    
    if (phaseValue) phaseValue.textContent = `Fase ${data.current_phase || '-'}`;
    if (phaseDay) phaseDay.textContent = `Hari ke ${data.day_in_phase || '-'} / ${data.phase_days_total || '-'}`;
    
    const currentEC = data.current_ec || 0;
    const targetEC = data.target_ec || 0;
    if (ecValue) ecValue.textContent = currentEC.toFixed(2);
    if (ecTarget) ecTarget.textContent = `Target: ${targetEC.toFixed(2)}`;
    
    if (wateringCount) wateringCount.textContent = data.watering_today || 0;
    if (wateringLimit) wateringLimit.textContent = `/ ${data.watering_per_day || 0} hari ini`;
    
    const autoToggle = document.getElementById('autoModeToggle');
    if (autoToggle && data.auto_mode !== undefined) {
        autoToggle.checked = data.auto_mode;
        const autoStatus = document.getElementById('autoModeStatus');
        if (autoStatus) autoStatus.textContent = data.auto_mode ? 'ON' : 'OFF';
        saveAutoMode(data.auto_mode);
    }
    
    if (data.watering_gh !== undefined) {
        updateGhModeUI(data.watering_gh);
        saveGhMode(data.watering_gh);
    }

    if (data.planting_date && data.planting_time) {
        updatePlantingDateFromMQTT({ planting_date: data.planting_date, planting_time: data.planting_time });
    } else if (data.days_since_planting !== undefined && currentPlantingDate) {
        // Hanya update tampilan hari tanpa mengubah tanggal
        const [date, time] = currentPlantingDate.split(' ');
        if (date && time) updatePlantingDisplay(date, time);
    }
}

function updateMixingStatus(data) {
    lastData.mixing = data;
    
    const statusText = document.getElementById('mixingStatusText');
    const indicator = document.getElementById('mixingIndicator');
    const availableVolume = document.getElementById('availableVolume');
    const correctionAttempts = document.getElementById('correctionAttempts');
    
    if (statusText && indicator) {
        switch(data.status) {
            case 'mixing':
                statusText.textContent = 'Mixing in Progress...';
                indicator.className = 'status-indicator mixing';
                break;
            case 'ready':
                statusText.textContent = 'Solution Ready';
                indicator.className = 'status-indicator ready';
                break;
            default:
                statusText.textContent = 'Idle';
                indicator.className = 'status-indicator idle';
        }
    }
    
    if (availableVolume) availableVolume.innerHTML = `${(data.total_volume || 0).toFixed(1)} L`;
    if (correctionAttempts) correctionAttempts.textContent = data.correction_attempts || 0;
}

function updateGreenhouseData(greenhouse, data) {
    lastData[greenhouse] = data;
    
    const prefix = greenhouse === 'gh1' ? 'gh1' : 'gh2';
    const temp = data.temperature || 0;
    const hum = data.humidity || 0;
    const light = data.light_intensity || 0;
    const isSunny = data.is_sunny || false;
    
    const tempEl = document.getElementById(`${prefix}Temp`);
    const humEl = document.getElementById(`${prefix}Hum`);
    const lightEl = document.getElementById(`${prefix}Light`);
    const weatherDiv = document.getElementById(`${prefix}Weather`);
    
    if (tempEl) tempEl.textContent = temp.toFixed(1);
    if (humEl) humEl.textContent = hum.toFixed(0);
    if (lightEl) lightEl.textContent = light.toFixed(0);
    
    if (weatherDiv) {
        if (isSunny) {
            weatherDiv.className = 'weather-status sunny';
            weatherDiv.innerHTML = `<i class="fas fa-sun"></i><span>Cerah - Cocok untuk penyiraman</span>`;
        } else {
            weatherDiv.className = 'weather-status rainy';
            weatherDiv.innerHTML = `<i class="fas fa-cloud-rain"></i><span>Mendung/Hujan - Tidak disarankan menyiram</span>`;
        }
    }
}

function updateWaterLevel(data) {
    const levelPercent = data.water_level_percent || 0;
    const volume = data.water_volume_liters || 0;
    
    const waterLevelValue = document.getElementById('waterLevelValue');
    const waterLevelVolume = document.getElementById('waterLevelVolume');
    
    if (waterLevelValue) waterLevelValue.textContent = `${levelPercent.toFixed(0)}%`;
    if (waterLevelVolume) waterLevelVolume.innerHTML = `${volume.toFixed(1)} L`;
}

function updateECCorrection(data) {
    if (data.success) {
        addAlert('success', `Koreksi EC berhasil! EC akhir: ${data.final_ec} (${data.attempts} attempt)`);
    } else {
        addAlert('danger', `Koreksi EC gagal setelah ${data.attempts} attempt! EC akhir: ${data.final_ec}`);
    }
}

function updateSchedule(data) {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;
    
    if (!data.schedules || data.schedules.length === 0) {
        scheduleList.innerHTML = '<div class="schedule-empty">Belum ada jadwal</div>';
        return;
    }
    
    let html = '';
    data.schedules.forEach((schedule, index) => {
        const statusClass = schedule.executed ? 'executed' : 'pending';
        const statusText = schedule.executed ? 'Executed' : 'Pending';
        html += `<div class="schedule-item"><div class="schedule-time"><i class="far fa-clock"></i><span>Jadwal ${index + 1}</span><strong>${schedule.hour.toString().padStart(2, '0')}:${schedule.minute.toString().padStart(2, '0')}</strong></div><span class="schedule-status ${statusClass}">${statusText}</span></div>`;
    });
    
    scheduleList.innerHTML = html;
}

function handleMessage(topic, message) {
    try {
        const data = JSON.parse(message);
        
        if (topic === MQTT_CONFIG.topics.masterStatus) {
            updateMasterStatus(data);
        } else if (topic === MQTT_CONFIG.topics.mixingStatus) {
            updateMixingStatus(data);
        } else if (topic === MQTT_CONFIG.topics.gh1Sensor) {
            updateGreenhouseData('gh1', data);
        } else if (topic === MQTT_CONFIG.topics.gh2Sensor) {
            updateGreenhouseData('gh2', data);
        } else if (topic === MQTT_CONFIG.topics.alerts) {
            addAlert(data.level || 'info', data.message);
        } else if (topic === MQTT_CONFIG.topics.waterLevel) {
            updateWaterLevel(data);
        } else if (topic === MQTT_CONFIG.topics.ecCorrection) {
            updateECCorrection(data);
        } else if (topic === MQTT_CONFIG.topics.scheduleUpdate) {
            updateSchedule(data);
        } else if (topic === MQTT_CONFIG.topics.plantingDatetopic) {
            updatePlantingDateFromMQTT(data);
        }
        
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString('id-ID');
        
    } catch (e) {
        console.log('Non-JSON message:', topic, message);
    }
}

// ====================================================================
// MQTT INITIALIZATION
// ====================================================================
function initMQTT() {
    const options = {
        clientId: `dashboard_${Math.random().toString(16).substr(2, 8)}`,
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        keepalive: 60
    };

    console.log('Connecting to MQTT broker...');
    updateConnectionStatus('connecting', 'Menghubungkan...');

    mqttClient = mqtt.connect(MQTT_CONFIG.broker, options);

    mqttClient.on('connect', () => {
        console.log('MQTT Connected!');
        updateConnectionStatus('connected', 'Terhubung');
        
        const topics = Object.values(MQTT_CONFIG.topics);
        topics.forEach(topic => {
            if (topic !== MQTT_CONFIG.topics.control) {
                mqttClient.subscribe(topic, (err) => {
                    if (!err) console.log(`Subscribed to: ${topic}`);
                });
            }
        });
        
        addAlert('info', 'Terhubung ke MQTT Broker');
    });

    mqttClient.on('message', (topic, message) => {
        handleMessage(topic, message.toString());
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT Error:', err);
        updateConnectionStatus('disconnected', 'Error');
        addAlert('danger', `MQTT Error: ${err.message}`);
    });

    mqttClient.on('close', () => {
        console.log('MQTT Disconnected');
        updateConnectionStatus('disconnected', 'Terputus');
        addAlert('warning', 'Koneksi MQTT terputus, mencoba menyambung kembali...');
    });

    mqttClient.on('reconnect', () => {
        console.log('MQTT Reconnecting...');
        updateConnectionStatus('connecting', 'Menghubungkan...');
    });
}

// ====================================================================
// EVENT LISTENERS
// ====================================================================
function initEventListeners() {
    // GH Mode Buttons
    const btnBoth = document.getElementById('ghModeBoth');
    const btn1 = document.getElementById('ghMode1');
    const btn2 = document.getElementById('ghMode2');
    
    if (btnBoth) btnBoth.addEventListener('click', () => setGhMode(0));
    if (btn1) btn1.addEventListener('click', () => setGhMode(1));
    if (btn2) btn2.addEventListener('click', () => setGhMode(2));
    
    // Mix Button
    const mixBtn = document.getElementById('mixBtn');
    if (mixBtn) {
        mixBtn.addEventListener('click', () => {
            const targetEC = parseFloat(document.getElementById('targetEC')?.value);
            const volume = parseFloat(document.getElementById('mixVolume')?.value);
            
            if (isNaN(targetEC) || targetEC <= 0) {
                addAlert('danger', 'Target EC tidak valid!');
                return;
            }
            if (isNaN(volume) || volume <= 0) {
                addAlert('danger', 'Volume mixing tidak valid!');
                return;
            }
            
            publishCommand('mix', { target_ec: targetEC, volume: volume });
            addAlert('info', `Mix: EC=${targetEC}, Volume=${volume}L`);
        });
    }
    
    // Water Buttons
    const waterBtn = document.getElementById('waterBtn');
    const water1Btn = document.getElementById('water1Btn');
    const water2Btn = document.getElementById('water2Btn');
    
    if (waterBtn) {
        waterBtn.addEventListener('click', () => {
            publishCommand('water', { greenhouse: 0, volume_per_plant: getWaterVolume() });
            addAlert('info', `Watering kedua greenhouse: ${getWaterVolume()} ml/plant`);
        });
    }
    
    if (water1Btn) {
        water1Btn.addEventListener('click', () => {
            publishCommand('water', { greenhouse: 1, volume_per_plant: getWaterVolume() });
            addAlert('info', `Watering GH1: ${getWaterVolume()} ml/plant`);
        });
    }
    
    if (water2Btn) {
        water2Btn.addEventListener('click', () => {
            publishCommand('water', { greenhouse: 2, volume_per_plant: getWaterVolume() });
            addAlert('info', `Watering GH2: ${getWaterVolume()} ml/plant`);
        });
    }
    
    // Auto Mode Toggle
    const autoToggle = document.getElementById('autoModeToggle');
    if (autoToggle) {
        autoToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            saveAutoMode(isEnabled);
            publishCommand('auto_mode', isEnabled ? 'ON' : 'OFF');
            const autoStatus = document.getElementById('autoModeStatus');
            if (autoStatus) autoStatus.textContent = isEnabled ? 'ON' : 'OFF';
            addAlert('info', `Mode otomatis ${isEnabled ? 'diaktifkan' : 'dinonaktifkan'}`);
        });
    }
    
    // Input Saving
    const targetECInput = document.getElementById('targetEC');
    const mixVolumeInput = document.getElementById('mixVolume');
    const waterVolumeInput = document.getElementById('waterPlantVolume');
    const savePlantingBtn = document.getElementById('savePlantingBtn');
    const refreshScheduleBtn = document.getElementById('refreshScheduleBtn');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    
    if (targetECInput) targetECInput.addEventListener('change', () => saveTargetEC(targetECInput.value));
    if (mixVolumeInput) mixVolumeInput.addEventListener('change', () => saveMixVolume(mixVolumeInput.value));
    if (waterVolumeInput) waterVolumeInput.addEventListener('change', () => saveWaterVolume(waterVolumeInput.value));
    if (savePlantingBtn) savePlantingBtn.addEventListener('click', sendPlantingDate);
    if (refreshScheduleBtn) refreshScheduleBtn.addEventListener('click', () => publishCommand('request_data', 'schedule'));
    if (saveConfigBtn) saveConfigBtn.addEventListener('click', sendConfigToMQTT);
}

// ====================================================================
// INITIALIZATION
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    initDateTime();
    loadAllSettings();
    initMQTT();
    initEventListeners();
    initPlantingDate();
    startClock();
});

// Export for debugging
window.debug = {
    mqttClient: () => mqttClient,
    lastData: () => lastData,
    sendCommand: publishCommand
};