// --- Variáveis Globais e Referências DOM ---
let ws = null;
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Elementos da Conexão
const ipPart1 = document.getElementById('ipPart1');
const ipPart2 = document.getElementById('ipPart2');
const ipPart3 = document.getElementById('ipPart3');
const ipPart4 = document.getElementById('ipPart4');
const connectBtn = document.getElementById('connectBtn');
const statusDiv = document.getElementById('statusDiv');
const lastMessageInfo = document.getElementById('lastMessageInfo');

// Elementos das Abas
const tabButtons = document.querySelectorAll('.tab-button');
const customDeckGrids = {
    customDeck1: document.getElementById('customDeckGrid1'),
    customDeck2: document.getElementById('customDeckGrid2'),
    customDeck3: document.getElementById('customDeckGrid3')
};
const toggleEditModeBtns = {
    customDeck1: document.getElementById('toggleEditModeBtn1'),
    customDeck2: document.getElementById('toggleEditModeBtn2'),
    customDeck3: document.getElementById('toggleEditModeBtn3')
};

// Botões de Limpar Deck
const clearDeckBtn1 = document.getElementById('clearDeckBtn1');
const clearDeckBtn2 = document.getElementById('clearDeckBtn2');
const clearDeckBtn3 = document.getElementById('clearDeckBtn3');


// Dados do Custom Deck (Configuração de cada botão por Deck)
let customDeckConfigs = {
    customDeck1: [],
    customDeck2: [],
    customDeck3: []
};

// Estado do Deck Personalizado
let editModes = {
    customDeck1: false,
    customDeck2: false,
    customDeck3: false
};
let currentActiveTab = 'customDeck1';
const activeButtons = new Set(); // Para rastrear notas/CCs ativas (mousedown/touchstart)

// Variáveis para Long Press (para botões do Deck)
let pressTimer = null;
const LONG_PRESS_THRESHOLD = 500; // Milissegundos para considerar um "long press"

// Modal de Configuração de Botão (EXISTENTE)
const configModal = document.getElementById('configModal');
const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
const configType = document.getElementById('configType');
const configMidiChannel = document.getElementById('configMidiChannel');
const configMidiNumber = document.getElementById('configMidiNumber');
const configValue = document.getElementById('configValue');
const configLabel = document.getElementById('configLabel');
const configColor = document.getElementById('configColor');
const configValueGroup = document.getElementById('configValueGroup');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const clearButtonConfigBtn = document.getElementById('clearButtonConfigBtn');

let currentEditingButton = { tab: null, index: null };


// --- Variáveis e Referências DOM para a CUE LIST ---
const cuesContainer = document.getElementById('cuesContainer');
const addCueBtn = document.getElementById('addCueBtn');
const goNextCueBtn = document.getElementById('goNextCueBtn'); // Botão GO para avançar
const goPrevCueBtn = document.getElementById('goPrevCueBtn'); // Botão GO- para retroceder
const clearCueListBtn = document.getElementById('clearCueListBtn');

let cueList = [];
let currentCueIndex = -1; // -1 significa nenhuma cue ativa
let cuePlaybackTimeout = null; // Para gerir o delay das cues
let lastActionWasSelection = false;

// Variáveis para Drag & Drop
let draggedCueIndex = null;

// Modal de Configuração de Cue
const cueConfigModal = document.getElementById('cueConfigModal');
const closeCueConfigModalBtn = document.getElementById('closeCueConfigModalBtn');
const cueConfigType = document.getElementById('cueConfigType');
const cueConfigMidiChannel = document.getElementById('cueConfigMidiChannel');
const cueConfigMidiNumber = document.getElementById('cueConfigMidiNumber');
const cueConfigValue = document.getElementById('cueConfigValue');
const cueConfigDelay = document.getElementById('cueConfigDelay');
const cueConfigLabel = document.getElementById('cueConfigLabel');
const cueConfigMediaType = document.getElementById('cueConfigMediaType');
const cueConfigQuantity = document.getElementById('cueConfigQuantity');
const cueConfigColor = document.getElementById('cueConfigColor');
const cueConfigValueGroup = document.getElementById('cueConfigValueGroup');
const saveCueConfigBtn = document.getElementById('saveCueConfigBtn');

let currentEditingCue = null; // Guarda a referência da cue que está a ser editada (ou null se for nova)


// --- Funções Auxiliares MIDI ---
/**
 * Converte um número de nota MIDI em seu nome (ex: 60 -> C4).
 * @param {number} midiNote - O número da nota MIDI (0-127).
 * @returns {string} O nome da nota e oitava.
 */
function getNoteNameFromMIDI(midiNote) {
    if (midiNote < 0 || midiNote > 127) return 'N/A';
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
}

/**
 * Envia uma mensagem Note On MIDI via WebSocket.
 * @param {number} channel - Canal MIDI (0-15).
 * @param {number} note - Número da nota MIDI (0-127).
 */
function sendNoteOn(channel, note, velocity) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket não conectado ou pronto para enviar.');
        return;
    }
    if (isNaN(note) || note < 0 || note > 127) { console.warn(`Tentativa de enviar nota MIDI inválida: ${note}`); return; }
    if (isNaN(velocity) || velocity < 1 || velocity > 127) { console.warn(`Velocidade MIDI inválida: ${velocity}`); return; }
    if (isNaN(channel) || channel < 0 || channel > 15) { console.warn(`Canal MIDI inválido: ${channel + 1}`); return; }

    const message = { type: 'noteOn', channel: channel, note: note, velocity: velocity };
    ws.send(JSON.stringify(message));
    const noteName = getNoteNameFromMIDI(note);
    lastMessageInfo.textContent = `Note ON: ${noteName} (${note}) - Velocidade: ${velocity} - Canal: ${channel + 1}`;
    console.log('Note ON (via WebSocket):', noteName, note, velocity, channel + 1);
}

/**
 * Envia uma mensagem Note Off MIDI via WebSocket.
 * @param {number} channel - Canal MIDI (0-15).
 * @param {number} note - Número da nota MIDI (0-127).
 */
function sendNoteOff(channel, note) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket não conectado ou pronto para enviar.');
        return;
    }
    if (isNaN(note) || note < 0 || note > 127) { console.warn(`Tentativa de enviar nota MIDI inválida (OFF): ${note}`); return; }
    if (isNaN(channel) || channel < 0 || channel > 15) { console.warn(`Canal MIDI inválido (OFF): ${channel + 1}`); return; }

    const message = { type: 'noteOff', channel: channel, note: note };
    ws.send(JSON.stringify(message));
    const noteName = getNoteNameFromMIDI(note);
    lastMessageInfo.textContent = `Note OFF: ${noteName} (${note}) - Canal: ${channel + 1}`;
    console.log('Note OFF (via WebSocket):', noteName, note, channel + 1);
}

/**
 * Envia uma mensagem Control Change MIDI via WebSocket.
 * @param {number} channel - Canal MIDI (0-15).
 * @param {number} ccNumber - Número do controlador CC (0-127).
 * @param {number} value - Valor do controlador (0-127).
 */
function sendControlChange(channel, ccNumber, value) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket não conectado ou pronto para enviar.');
        return;
    }
    if (isNaN(channel) || channel < 0 || channel > 15) { console.warn(`Canal MIDI inválido: ${channel + 1}`); return; }
    if (isNaN(ccNumber) || ccNumber < 0 || ccNumber > 127) { console.warn(`Número de controlador CC inválido: ${ccNumber}`); return; }
    if (isNaN(value) || value < 0 || value > 127) { console.warn(`Valor de CC inválido: ${value}`); return; }

    const message = { type: 'controlChange', channel: channel, controller: ccNumber, value: value };
    ws.send(JSON.stringify(message));
    lastMessageInfo.textContent = `CC: ${ccNumber} - Valor: ${value} - Canal: ${channel + 1}`;
    console.log('Control Change (via WebSocket):', ccNumber, value, channel + 1);
}


// --- Funções de Conexão e Estado ---
/**
 * Constrói a URL do WebSocket a partir das partes do IP.
 * @returns {string} A URL completa do WebSocket.
 */
function getWebSocketUrl() {
    const p1 = ipPart1.value || '0';
    const p2 = ipPart2.value || '0';
    const p3 = ipPart3.value || '0';
    const p4 = ipPart4.value || '0';
    return `ws://${p1}.${p2}.${p3}.${p4}:8080`;
}

/**
 * Tenta conectar ao servidor WebSocket MIDI.
 */
function connectWebSocket() {
    const url = getWebSocketUrl();
    if (!url) { statusDiv.textContent = 'Erro: Insira o endereço do servidor MIDI.'; statusDiv.className = 'status disconnected'; return; }
    
    statusDiv.textContent = 'Conectando ao servidor MIDI...';
    statusDiv.className = 'status disconnected';
    connectBtn.disabled = true;

    // Desabilitar inputs de IP enquanto tenta conectar
    document.querySelectorAll('.ip-part').forEach(input => input.disabled = true);

    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('Conectado ao servidor WebSocket.');
        statusDiv.textContent = 'Conectado ao servidor MIDI!';
        statusDiv.className = 'status connected';
        // Atualiza o estado de habilitação dos botões da aba ativa e da cue list
        updateButtonStates(currentActiveTab);
        updateCueNavButtonsState(); // Para a cue list
    };
    ws.onmessage = (event) => { console.log('Mensagem do servidor:', event.data); };
    ws.onclose = () => {
        console.log('Desconectado do servidor WebSocket.');
        statusDiv.textContent = 'Desconectado - Verifique o endereço e reconecte.';
        statusDiv.className = 'status disconnected';
        connectBtn.disabled = false;
        document.querySelectorAll('.ip-part').forEach(input => input.disabled = false); // Reabilitar inputs
        disableAllCustomDeckButtons(); // Desabilita todos os botões em todas as abas
        updateCueNavButtonsState(); // Para a cue list
    };
    ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        statusDiv.textContent = 'Erro de conexão: Verifique o endereço e se o servidor está ativo.';
        statusDiv.className = 'status disconnected';
        connectBtn.disabled = false;
        document.querySelectorAll('.ip-part').forEach(input => input.disabled = false); // Reabilitar inputs
        disableAllCustomDeckButtons(); // Desabilita todos os botões em todas as abas
        updateCueNavButtonsState(); // Para a cue list
    };
}


// --- Funções para Atualizar o Estado dos Botões do Deck ---
/**
 * Atualiza o estado visual e interativo dos botões de um deck específico.
 * @param {string} tabName - O nome da aba (e do deck) a ser atualizado.
 */
function updateButtonStates(tabName) {
    const grid = customDeckGrids[tabName];
    if (!grid) return;

    const isConnected = (ws && ws.readyState === WebSocket.OPEN);

    grid.querySelectorAll('.custom-deck-button').forEach(button => {
        const index = parseInt(button.dataset.index);
        const config = customDeckConfigs[tabName][index];

        // Atualizar o texto do botão
        const buttonContent = button.querySelector('.button-content');
        if (buttonContent) {
            buttonContent.textContent = config.label;
        }

        // Gerenciar classe 'unconfigured' visualmente (sempre presente se não configurado)
        if (!config.configured) {
            button.classList.add('unconfigured');
        } else {
            button.classList.remove('unconfigured');
            // Aplica a cor configurada ou retorna ao padrão se não definida
            button.style.backgroundColor = config.color || '#607d8b';
            button.style.backgroundImage = config.color ? 'none' : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)';
        }

        // Gerenciar classe 'edit-mode' (somente para a aba ativa)
        if (editModes[tabName]) {
            button.classList.add('edit-mode');
        } else {
            button.classList.remove('edit-mode');
        }

        // Adiciona/remove uma classe que indica se pode enviar MIDI
        if (config.configured && isConnected && !editModes[tabName]) {
            button.classList.add('can-send-midi');
        } else {
            button.classList.remove('can-send-midi');
        }
    });
}

/**
 * Desabilita visualmente todos os botões de todos os Custom Decks, removendo classes de interação.
 */
function disableAllCustomDeckButtons() {
    Object.keys(customDeckGrids).forEach(tabName => {
        const grid = customDeckGrids[tabName];
        if (grid) {
            grid.querySelectorAll('.custom-deck-button').forEach(button => {
                button.classList.remove('edit-mode');
                button.classList.remove('can-send-midi');
                const index = parseInt(button.dataset.index);
                if (customDeckConfigs[tabName][index] && !customDeckConfigs[tabName][index].configured) {
                    button.classList.add('unconfigured');
                } else {
                    button.classList.remove('unconfigured');
                }
            });
        }
    });
}


// --- Funções para o "Deck Personalizado" ---
/**
 * Cria os botões para um deck personalizado e carrega/salva sua configuração.
 * @param {string} tabName - O nome da aba (e do deck) a ser criada.
 */
function createCustomDeck(tabName) {
    const grid = customDeckGrids[tabName];
    if (!grid) return;

    grid.innerHTML = '';
    const savedConfig = localStorage.getItem(`customDeckConfig_${tabName}`);

    if (savedConfig) {
        try {
            customDeckConfigs[tabName] = JSON.parse(savedConfig);
        } catch (e) {
            console.error(`Erro ao carregar customDeckConfig para ${tabName} do localStorage:`, e);
            customDeckConfigs[tabName] = [];
        }
    }

    // Criar sempre 20 botões (5x4)
    for (let i = 0; i < 20; i++) {
        if (!customDeckConfigs[tabName][i]) {
            // Configuração padrão para um novo botão
            customDeckConfigs[tabName][i] = {
                type: 'note',
                midiChannel: 0, // MIDI channel 1 (0-indexed)
                midiNumber: 60 + i, // C4, C#4, D4...
                value: 100, // Velocity for notes, value for CC
                label: `Botão ${i + 1}`,
                color: '#607d8b', // Cor padrão
                configured: false // Flag para indicar se o botão foi configurado pelo usuário
            };
        }
        // Garante que o flag 'configured' exista (para migrações de configs antigas)
        if (typeof customDeckConfigs[tabName][i].configured === 'undefined') {
            customDeckConfigs[tabName][i].configured = false;
        }

        const button = document.createElement('button');
        button.className = 'midi-button custom-deck-button';
        button.dataset.index = i;
        button.dataset.tabName = tabName;
        
        const buttonContent = document.createElement('div');
        buttonContent.className = 'button-content';
        buttonContent.textContent = customDeckConfigs[tabName][i].label; // Define o label inicial aqui
        button.appendChild(buttonContent);

        // Aplica o estado inicial (classes, cor, etc.).
        updateButtonStates(tabName);

        let isButtonPressed = false; // Flag para rastrear se uma nota/CC foi enviada
        let ignoreClick = false; // Flag para ignorar um click após um long press (no touchend/mouseup)

        const startInteraction = (e) => {
            e.preventDefault();
            
            // Adiciona classe 'active' visualmente logo ao pressionar
            button.classList.add('active');

            // --- Lógica para abrir o modal ou enviar MIDI ---
            if (editModes[tabName]) {
                // Se o Modo de Edição está ATIVO, abre o modal.
                openConfigModal(tabName, i);
                button.classList.remove('active'); // Remove o estilo de ativo após abrir o modal
                return; // Interrompe o fluxo para não enviar MIDI
            }

            // --- Lógica para envio de MIDI (apenas se permitido e fora do modo de edição) ---
            // Só envia MIDI se o botão tiver a classe 'can-send-midi' E o modo de edição não está ativo
            if (button.classList.contains('can-send-midi')) {
                const buttonId = `${tabName}-${i}`;
                if (!activeButtons.has(buttonId)) {
                    activeButtons.add(buttonId);
                    isButtonPressed = true; // Marca que o botão foi pressionado e enviou MIDI ON
                    const config = customDeckConfigs[tabName][i];
                    if (config.type === 'note') {
                        sendNoteOn(config.midiChannel, config.midiNumber, config.value);
                    } else if (config.type === 'cc') {
                        sendControlChange(config.midiChannel, config.midiNumber, config.value);
                    }
                }
            }
        };

        const endInteraction = (e) => {
            // Sempre remove a classe 'active'
            button.classList.remove('active');

            // Se o modo de edição está ativo, não processa como clique normal MIDI.
            if (editModes[tabName]) {
                isButtonPressed = false; // Garante que a nota OFF não seja enviada
                return;
            }
            
            // Processa o "soltar" (mouseup/touchend) apenas se uma interação MIDI foi iniciada
            // e o botão tinha permissão para enviar MIDI.
            const buttonId = `${tabName}-${i}`;
            if (activeButtons.has(buttonId) && isButtonPressed && button.classList.contains('can-send-midi')) {
                activeButtons.delete(buttonId);
                isButtonPressed = false; // Reseta a flag

                const config = customDeckConfigs[tabName][i];
                if (config && config.type === 'note') {
                    sendNoteOff(config.midiChannel, config.midiNumber);
                }
                // CCs são momentâneos, não precisam de 'off'
            }
        };

        const cancelInteraction = () => {
            button.classList.remove('active');
            isButtonPressed = false;
            // Se uma nota ON foi enviada e não houve OFF, envia o OFF ao cancelar
            if (ws && ws.readyState === WebSocket.OPEN) {
                const buttonId = `${tabName}-${i}`;
                if (activeButtons.has(buttonId)) {
                    activeButtons.delete(buttonId);
                    const config = customDeckConfigs[tabName][i];
                    if (config && config.type === 'note') {
                        sendNoteOff(config.midiChannel, config.midiNumber);
                    }
                }
            }
        };


        button.addEventListener('mousedown', startInteraction);
        button.addEventListener('mouseup', endInteraction);
        button.addEventListener('mouseleave', cancelInteraction);
        
        button.addEventListener('touchstart', startInteraction, { passive: true }); // Usar passive para melhor performance em mobile
        button.addEventListener('touchend', endInteraction);
        button.addEventListener('touchcancel', cancelInteraction);

        grid.appendChild(button);
    }
    saveCustomDeckConfig(tabName);
}

/**
 * Salva a configuração de um deck personalizado no localStorage.
 * @param {string} tabName - O nome da aba (e do deck) a ser salva.
 */
function saveCustomDeckConfig(tabName) {
    localStorage.setItem(`customDeckConfig_${tabName}`, JSON.stringify(customDeckConfigs[tabName]));
    console.log(`Configuração do Deck Personalizado ${tabName} salva.`, customDeckConfigs[tabName]);
}


// --- Funções do Modal de Configuração de Botão (EXISTENTE) ---
/**
 * Abre o modal de configuração para um botão específico do deck.
 * @param {string} tabName - O nome da aba onde o botão está.
 * @param {number} buttonIndex - O índice do botão na configuração.
 */
function openConfigModal(tabName, buttonIndex) {
    closeConfigModal();
    closeCueConfigModal(); // Certifica que o modal da cue está fechado

    currentEditingButton = { tab: tabName, index: buttonIndex };
    const config = customDeckConfigs[tabName][buttonIndex];

    configType.value = config.type;
    configMidiChannel.value = config.midiChannel + 1; // Display 1-16
    configMidiNumber.value = config.midiNumber;
    configValue.value = config.value;
    configLabel.value = config.label;
    configColor.value = config.color || '#607d8b';

    if (configType.value === 'note') {
        configValueGroup.querySelector('label').textContent = 'Velocidade (1-127):';
        configValue.min = '1';
        configValue.max = '127';
        if (parseInt(configValue.value) === 0) configValue.value = '100';
    } else { // type === 'cc'
        configValueGroup.querySelector('label').textContent = 'Valor (0-127):';
        configValue.min = '0';
        configValue.max = '127';
    }

    configModal.style.display = 'flex';
}

/**
 * Fecha o modal de configuração de botão.
 */
function closeConfigModal() {
    configModal.style.display = 'none';
    currentEditingButton = { tab: null, index: null };
}

// Event listener para mudança de tipo no modal de configuração de botão
configType.addEventListener('change', () => {
    if (configType.value === 'note') {
        configValueGroup.querySelector('label').textContent = 'Velocidade (1-127):';
        configValue.min = '1';
        configValue.max = '127';
        if (parseInt(configValue.value) === 0) configValue.value = '100';
    } else { // type === 'cc'
        configValueGroup.querySelector('label').textContent = 'Valor (0-127):';
        configValue.min = '0';
        configValue.max = '127';
    }
});

// Event listener para salvar configuração do botão
saveConfigBtn.addEventListener('click', () => {
    const { tab: tabName, index } = currentEditingButton;
    if (tabName === null || index === null) return;

    let midiChannel = parseInt(configMidiChannel.value);
    if (isNaN(midiChannel) || midiChannel < 1) midiChannel = 1;
    if (midiChannel > 16) midiChannel = 16;
    midiChannel = midiChannel - 1;

    let midiNumber = parseInt(configMidiNumber.value);
    if (isNaN(midiNumber) || midiNumber < 0) midiNumber = 0;
    if (midiNumber > 127) midiNumber = 127;

    let value = parseInt(configValue.value);
    if (isNaN(value)) value = (configType.value === 'note') ? 100 : 0;
    if (configType.value === 'note') {
        if (value < 1) value = 1;
        if (value > 127) value = 127;
    } else { // CC
        if (value < 0) value = 0;
        if (value > 127) value = 127;
    }

    customDeckConfigs[tabName][index] = {
        type: configType.value,
        midiChannel: midiChannel,
        midiNumber: midiNumber,
        value: value,
        label: configLabel.value || `Botão ${index + 1}`,
        color: configColor.value,
        configured: true
    };

    saveCustomDeckConfig(tabName);
    updateButtonStates(tabName);
    closeConfigModal();
});

// Event listener para limpar a configuração de um botão
if (clearButtonConfigBtn) {
    clearButtonConfigBtn.addEventListener('click', () => {
        const { tab: tabName, index } = currentEditingButton;
        if (tabName === null || index === null) return;

        if (confirm('Tem certeza que deseja limpar a configuração deste botão?')) {
            // Resetar a configuração para os valores padrão
            // Nota: Este default deve corresponder ao que é gerado na função createCustomDeck
            customDeckConfigs[tabName][index] = {
                type: 'note',
                midiChannel: 0, // MIDI channel 1 (0-indexed)
                midiNumber: 60 + index, // Ex: C4, C#4... (um default razoável)
                value: 100, // Velocity for notes, value for CC
                label: `Botão ${index + 1}`,
                color: '#607d8b', // Cor padrão
                configured: false // Marca como não configurado
            };

            saveCustomDeckConfig(tabName);
            updateButtonStates(tabName); // Atualiza visualmente o deck
            closeConfigModal(); // Fechar o modal após limpar
            console.log(`Botão ${index + 1} do ${tabName} limpo.`);
        }
    });
}

// Event listener para fechar o modal de configuração de botão
closeConfigModalBtn.addEventListener('click', closeConfigModal);


// --- Funções da CUE LIST ---

/**
 * Salva a lista de cues no localStorage.
 */
function saveCueList() {
    localStorage.setItem('cueList', JSON.stringify(cueList));
    console.log('Cue List salva:', cueList);
}

/**
 * Carrega a lista de cues do localStorage e renderiza.
 */
function loadCueList() {
    const savedList = localStorage.getItem('cueList');
    if (savedList) {
        try {
            cueList = JSON.parse(savedList);
            // Garante que cada cue tem cueNumber e delay.
            // Para compatibilidade com versões antigas ou cues sem cueNumber
            cueList.forEach((cue) => {
                if (typeof cue.delay === 'undefined') cue.delay = 0;
                if (typeof cue.cueNumber === 'undefined' || cue.cueNumber === null || cue.cueNumber === '') {
                    // Atribui um número básico se não existir (temporariamente, será reordenado)
                    // Não é preciso gerar um número único aqui, a ordenação e a próxima adição corrigirirão.
                    cue.cueNumber = '0'; // Marcador temporário para cues sem número
                }
            });
            // Re-ordena as cues numericamente para garantir consistência
            //cueList.sort((a, b) => compareCueNumbers(a.cueNumber, b.cueNumber));

        } catch (e) {
            console.error('Erro ao carregar Cue List do localStorage:', e);
            cueList = [];
        }
    } else {
        cueList = [];
    }
    renderCueList();
}

/**
 * Compara dois números de cue (X.Y.Z...) para ordenação.
 * Ex: "1" < "1.1" < "1.2" < "2" < "2.1"
 * @param {string} a - O primeiro número de cue (ex: "1", "1.1", "2").
 * @param {string} b - O segundo número de cue.
 * @returns {number} - Um número negativo se a < b, positivo se a > b, 0 se a == b.
 */
function compareCueNumbers(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;

        if (numA !== numB) {
            return numA - numB;
        }
    }
    return 0; // Números são iguais
}

/**
 * Gera um novo número de cue com base na `currentCueIndex` (cue selecionada) ou na última cue da lista.
 * A lógica segue a hierarquia desejada:
 * - Se a lista estiver vazia, retorna "1".
 * - Se nenhuma cue estiver selecionada ou se a cue selecionada for a última da lista,
 * a nova cue será o próximo número principal (ex: 1 -> 2, ou se a lista termina em 1.2, adiciona 1.3).
 * - Se houver uma cue selecionada:
 * - Procura a próxima cue na lista.
 * - **PRIORIDADE 1: Criar um FILHO (X.Y -> X.Y.1)**
 * Isso acontece se a `selectedCue` JÁ É seguida por um IRMÃO DIRETO (X.Z, onde Z > Y)
 * ou se a `selectedCue` não tem filhos mas a `nextCue` é de um ramo maior (ex: 1 antes de 2, cria 1.1).
 * - **PRIORIDADE 2: Criar um IRMÃO (X.Y -> X.(Y+1))**
 * Isso acontece se a `selectedCue` *NÃO* é seguida por um irmão direto no seu nível,
 * mas sim por um filho (X.Y.Z) ou se as condições acima não se aplicam.
 * (ex: 1.1.1 selecionado, e a próxima é 1.2, cria 1.1.2).
 *
 * @returns {string} O novo número de cue gerado (ex: "1", "1.1", "1.1.1", "1.2").
 */
function generateNewCueNumber() {
    if (cueList.length === 0) {
        return "1"; // Se a lista está vazia, a primeira cue é sempre "1".
    }

    // Caso 1: Nenhuma cue selecionada ou adicionar ao final geral da lista.
    // Encontra o maior número principal (o primeiro segmento) e adiciona 1.
    if (currentCueIndex === -1 || currentCueIndex >= cueList.length) {
        let maxMajorNumber = 0;
        if (cueList.length > 0) {
            maxMajorNumber = Math.max(...cueList.map(cue => parseInt(cue.cueNumber.split('.')[0])));
        }
        return (maxMajorNumber + 1).toString();
    }

    // A partir daqui, uma cue está selecionada (`selectedCue`).
    const selectedCue = cueList[currentCueIndex];
    const selectedParts = selectedCue.cueNumber.split('.').map(Number);
    let newNumberParts = [...selectedParts]; // Começa com os segmentos da cue selecionada

    const nextCue = cueList[currentCueIndex + 1];

    // Caso 2: A cue selecionada é a última da lista.
    // Sempre adiciona o próximo irmão no mesmo nível.
    if (!nextCue) {
        newNumberParts[newNumberParts.length - 1]++;
        return newNumberParts.join('.'); // Ex: 1.1 (última) -> 1.2; 2 (última) -> 3
    }

    // Caso 3: Há uma próxima cue. Análise para determinar se é filho ou irmão.
    const nextParts = nextCue.cueNumber.split('.').map(Number);

    // Determina se a `nextCue` é um "irmão" direto da `selectedCue` no mesmo nível.
    // Ex: selected 1.1, next 1.2 -> isNextADirectSibling = true
    const isNextADirectSibling = nextParts.length === selectedParts.length &&
                                 nextParts.slice(0, selectedParts.length - 1).every((val, idx) => val === selectedParts[idx]) &&
                                 nextParts[selectedParts.length - 1] > selectedParts[selectedParts.length - 1];

    // Determina se a `nextCue` é um "filho" direto da `selectedCue`.
    // Ex: selected 1.1, next 1.1.1 -> isNextADirectChild = true
    const isNextADirectChild = nextParts.length === selectedParts.length + 1 &&
                               nextParts.slice(0, selectedParts.length).every((val, idx) => val === selectedParts[idx]);

    // Lógica para criar a nova cue:

    // CENÁRIO A: CRIAR FILHO (X.Y.1)
    // Isso acontece se a `selectedCue` JÁ É seguida por um IRMÃO DIRETO (X.Z),
    // ou se a `selectedCue` não tem filhos mas a `nextCue` é de um ramo maior.
    // Ex: Selected 1.1, Next 1.2 -> Crie 1.1.1
    // Ex: Selected 1, Next 2 -> Crie 1.1
    if (isNextADirectSibling || (nextParts[0] > selectedParts[0] && !isNextADirectChild)) {
        let maxChildSegment = 0;
        // Percorre as cues a partir da `selectedCue` para encontrar o maior filho existente.
        for (let i = currentCueIndex + 1; i < cueList.length; i++) {
            const checkCue = cueList[i];
            const checkParts = checkCue.cueNumber.split('.').map(Number);
            // Verifica se `checkCue` é um filho direto da `selectedCue`
            if (checkParts.length === selectedParts.length + 1 &&
                checkParts.slice(0, selectedParts.length).every((val, idx) => val === selectedParts[idx])) {
                maxChildSegment = Math.max(maxChildSegment, checkParts[checkParts.length - 1]);
            } else {
                // Para quando encontrar uma cue que não é um filho direto do ramo
                break;
            }
        }
        newNumberParts.push(maxChildSegment + 1); // Adiciona o próximo filho (ex: 1.1.1, 1.1.2...)
    }
    // CENÁRIO B: CRIAR IRMÃO (X.(Y+1))
    // Isso acontece se a `selectedCue` *NÃO* é seguida por um irmão direto,
    // mas sim por um filho (X.Y.Z) ou se as condições acima não se aplicam.
    // Ex: Selected 1.1.1, Next 1.2 -> Crie 1.1.2 (irmão do 1.1.1)
    else {
        let maxSiblingSegment = selectedParts[selectedParts.length - 1]; // Começa com o próprio número selecionado
        // Procura pelo maior irmão no mesmo nível que já existe a partir da `selectedCue`.
        for (let i = currentCueIndex + 1; i < cueList.length; i++) {
            const checkCue = cueList[i];
            const checkParts = checkCue.cueNumber.split('.').map(Number);
            // Verifica se `checkCue` é um irmão no mesmo nível
            if (checkParts.length === selectedParts.length &&
                checkParts.slice(0, selectedParts.length - 1).every((val, idx) => val === selectedParts[idx])) {
                maxSiblingSegment = Math.max(maxSiblingSegment, checkParts[checkParts.length - 1]);
            } else if (compareCueNumbers(checkCue.cueNumber, selectedCue.cueNumber) > 0) {
                // Se encontrar uma cue que não é um irmão, parar de procurar irmãos no mesmo nível.
                break;
            }
        }
        newNumberParts[newNumberParts.length - 1] = maxSiblingSegment + 1;
    }

    // Remove zeros finais indesejados (ex: 1.0.0 vira 1) - esta parte é estável.
    while (newNumberParts.length > 1 && newNumberParts[newNumberParts.length - 1] === 0) {
        newNumberParts.pop();
    }

    return newNumberParts.join('.');
}

/**
 * Renderiza a lista de cues no container HTML, incluindo suporte a Drag & Drop.
 */
function renderCueList() {
    cuesContainer.innerHTML = ''; // Limpa o container
    if (cueList.length === 0) {
        const noCuesMessage = document.createElement('p');
        noCuesMessage.className = 'no-cues-message';
        noCuesMessage.textContent = 'Nenhuma cue na lista. Clique em "Criar Cue" para começar.';
        cuesContainer.appendChild(noCuesMessage);
    } else {
        const existingNoCuesMessage = cuesContainer.querySelector('.no-cues-message');
        if (existingNoCuesMessage) {
            existingNoCuesMessage.remove();
        }

        cueList.forEach((cue, index) => {
            const cueItem = document.createElement('div');
            cueItem.className = 'cue-item';
            cueItem.dataset.index = index;
            cueItem.style.backgroundColor = cue.color || '#555'; // Aplica a cor da cue

            // Torna o item arrastável
            cueItem.setAttribute('draggable', 'true');

            // Adiciona listeners para Drag & Drop
            cueItem.addEventListener('dragstart', handleDragStart);
            cueItem.addEventListener('dragover', handleDragOver);
            cueItem.addEventListener('dragleave', handleDragLeave);
            cueItem.addEventListener('drop', handleDrop);
            cueItem.addEventListener('dragend', handleDragEnd);

            const cueInfo = document.createElement('div');
            cueInfo.className = 'cue-info';
            
            const cueNumberSpan = document.createElement('span');
            cueNumberSpan.className = 'cue-number';
            cueNumberSpan.textContent = `${cue.cueNumber}.`;
            
            const cueNameSpan = document.createElement('span');
            cueNameSpan.className = 'cue-name';
            cueNameSpan.textContent = cue.label;

            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.textContent = ' | ';

            const cueDetailsSpan = document.createElement('span');
            cueDetailsSpan.className = 'cue-details';
            let detailText = `CH: ${cue.midiChannel + 1}, `;
            if (cue.type === 'note') {
                detailText += `NOTE: ${cue.midiNumber} `;
            } else { // cc
                detailText += `CC: ${cue.midiNumber} `;
            }
            detailText += `DLY: ${cue.delay}s, `;
            detailText += `VAL: ${cue.value}`;

            cueDetailsSpan.textContent = detailText;

            cueInfo.appendChild(cueNumberSpan);
            cueInfo.appendChild(cueNameSpan);
            cueInfo.appendChild(separator);
            cueInfo.appendChild(cueDetailsSpan);

            cueItem.appendChild(cueInfo);

            const cueActions = document.createElement('div');
            cueActions.className = 'cue-actions';

            const editBtn = document.createElement('button');
            editBtn.className = 'cue-edit-btn';
            editBtn.innerHTML = '&#9998;'; // Ícone de lápis (editar)
            editBtn.title = 'Editar Cue';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Previne que o clique no item ative a cue
                openCueConfigModal(cue, index); // Passa a cue e o índice para edição
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'cue-delete-btn';
            deleteBtn.innerHTML = '&times;'; // Ícone de "X" (apagar)
            deleteBtn.title = 'Apagar Cue';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Previne que o clique no item ative a cue
                deleteCue(index);
            });

            cueActions.appendChild(editBtn);
            cueActions.appendChild(deleteBtn);
            cueItem.appendChild(cueActions);

            // Clique na cue para apenas selecioná-la (sem lançar o MIDI)
            cueItem.addEventListener('click', () => {
                selectCue(index);
            });

            cuesContainer.appendChild(cueItem);
        });
    }
    highlightCurrentCue();
    updateCueNavButtonsState();
}

/**
 * Funções Drag & Drop
 */
function handleDragStart(e) {
    draggedCueIndex = parseInt(e.target.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    // Adiciona uma classe ao item que está sendo arrastado para feedback visual
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault(); // Necessário para permitir o drop
    e.dataTransfer.dropEffect = 'move';

    const targetItem = e.target.closest('.cue-item');
    if (targetItem && targetItem !== e.target.closest('.dragging')) {
        const targetIndex = parseInt(targetItem.dataset.index);
        const draggedElement = document.querySelector('.dragging');

        // Remove a classe de arrasto de todos os itens primeiro
        cuesContainer.querySelectorAll('.cue-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        // Adiciona classe para indicar posição de drop
        if (targetIndex < draggedCueIndex) {
            targetItem.classList.add('drag-over-top');
        } else {
            targetItem.classList.add('drag-over-bottom');
        }
    }
}

function handleDragLeave(e) {
    const targetItem = e.target.closest('.cue-item');
    if (targetItem) {
        targetItem.classList.remove('drag-over-top', 'drag-over-bottom');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetItem = e.target.closest('.cue-item');
    if (!targetItem) {
        // Se soltar fora de um item válido, apenas limpa as classes
        handleDragEnd(e);
        return;
    }

    const targetIndex = parseInt(targetItem.dataset.index);

    // Limpa todas as classes de drag-over
    cuesContainer.querySelectorAll('.cue-item').forEach(item => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    if (draggedCueIndex !== null && draggedCueIndex !== targetIndex) {
        // Decide se é para mover antes ou depois do alvo
        let newIndex = targetIndex;
        if (draggedCueIndex < targetIndex) {
            // Se o item arrastado vem antes do alvo, e estamos soltando APÓS o alvo
            // A posição real para inserção é o índice do alvo.
            // Se soltou na "metade inferior" do alvo, fica após o alvo.
            // Caso contrário, fica antes do alvo.
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY > midpoint) {
                 newIndex = targetIndex; // Mantém o índice do alvo para inserção após
            } else {
                 newIndex = targetIndex; // Inserir antes do alvo
            }
        } else {
            // Se o item arrastado vem depois do alvo
            // A posição real para inserção é o índice do alvo.
            newIndex = targetIndex;
        }

        reorderCueList(draggedCueIndex, newIndex);
        currentCueIndex = newIndex; // Ajusta o índice da cue ativa após a reordenação
        saveCueList();
        renderCueList(); // Re-renderiza a lista para refletir a nova ordem
    }
    draggedCueIndex = null; // Reseta o índice arrastado
    handleDragEnd(e);
}

function handleDragEnd(e) {
    // Remove a classe 'dragging' do item que foi arrastado
    const draggedElement = document.querySelector('.dragging');
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
    }
    // Remove qualquer classe de drag-over que possa ter ficado
    cuesContainer.querySelectorAll('.cue-item').forEach(item => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
    });
}

/**
 * Reordena a cueList movendo um item de draggedIndex para targetIndex.
 * @param {number} draggedIndex - O índice original do item arrastado.
 * @param {number} targetIndex - O índice alvo onde o item será inserido.
 */
function reorderCueList(draggedIndex, targetIndex) {
    const [movedItem] = cueList.splice(draggedIndex, 1);
    cueList.splice(targetIndex, 0, movedItem);

    // OPCIONAL: Re-renumerar as cues após a reordenação, se desejar números sequenciais
    // Se você usa numeração X.Y.Z, re-numerar é complexo e pode não ser desejado.
    // Se a numeração é apenas sequencial (1, 2, 3...), pode ser implementado aqui.
    // Por enquanto, mantenha a numeração original, mas a ordem visual mudará.
    // Se a numeração X.Y.Z é crítica e precisa ser recalculada, esta função precisa de mais lógica.
    // No seu caso, a `generateNewCueNumber` já lida com a lógica X.Y.Z,
    // então a reordenação simples do array é suficiente para a ordem visual.
    
    // Assegura que o `currentCueIndex` seja ajustado para o novo local da cue.
    if (currentCueIndex === draggedIndex) {
        currentCueIndex = targetIndex;
    } else if (draggedIndex < currentCueIndex && targetIndex >= currentCueIndex) {
        currentCueIndex--;
    } else if (draggedIndex > currentCueIndex && targetIndex <= currentCueIndex) {
        currentCueIndex++;
    }
    
    console.log(`Cue movida de ${draggedIndex} para ${targetIndex}. Nova ordem:`, cueList.map(c => c.cueNumber));
}


/**
 * Seleciona uma cue específica na lista.
 * @param {number} index - O índice da cue a ser selecionada.
 */
function selectCue(index) {
    if (index >= 0 && index < cueList.length) {
        currentCueIndex = index;
        highlightCurrentCue();
        updateCueNavButtonsState();
        lastActionWasSelection = true; // NOVO: Ativar o sinalizador ao selecionar manualmente
    }
}

/**
 * Apaga uma cue da lista.
 * @param {number} index - O índice da cue a ser apagada.
 */
function deleteCue(index) {
    if (confirm('Tem certeza que deseja apagar esta cue?')) {
        cueList.splice(index, 1); // Remove a cue do array
        
        // Ajusta o currentCueIndex
        if (currentCueIndex >= index) {
            currentCueIndex--;
            if (currentCueIndex < 0 && cueList.length > 0) {
                currentCueIndex = 0;
            } else if (cueList.length === 0) {
                currentCueIndex = -1;
            }
        }
        // Não é necessário re-renumerar todas as cues aqui, pois a numeração X.Y.Z não se reajusta automaticamente.
        // Apenas a cue apagada desaparece.

        saveCueList();
        renderCueList();
    }
}

/**
 * Destaca visualmente a cue atualmente selecionada na lista.
 */
function highlightCurrentCue() {
    cuesContainer.querySelectorAll('.cue-item').forEach((item, idx) => {
        if (idx === currentCueIndex) {
            item.classList.add('active-cue');
            // Scroll para a cue ativa se estiver fora da vista
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('active-cue');
        }
    });
}

/**
 * Atualiza o estado de habilitação dos botões de navegação da cue list.
 */
function updateCueNavButtonsState() {
    const isConnected = (ws && ws.readyState === WebSocket.OPEN);
    
    // CORREÇÃO: Habilita o botão GO (goNextCueBtn) se houver pelo menos uma cue e estiver conectado
    goNextCueBtn.disabled = !isConnected || cueList.length === 0; 
    goPrevCueBtn.disabled = !isConnected || cueList.length === 0 || currentCueIndex <= 0;
    
    addCueBtn.disabled = false;
    clearCueListBtn.disabled = cueList.length === 0;
}

/**
 * Lança o evento MIDI da cue atualmente selecionada, com um delay configurável.
 * Esta função agora é a única responsável por enviar o MIDI.
 */
function launchCurrentCue() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        statusDiv.textContent = 'Erro: Não conectado ao servidor MIDI.';
        statusDiv.className = 'status disconnected';
        return;
    }

    if (cueList.length === 0 || currentCueIndex === -1) {
        console.warn('Nenhuma cue selecionada ou na lista para lançar.');
        return;
    }

    const cueToLaunch = cueList[currentCueIndex];
    if (!cueToLaunch) {
        console.warn(`Cue no índice ${currentCueIndex} não encontrada.`);
        return;
    }

    console.log(`Lançando cue: ${cueToLaunch.cueNumber}. ${cueToLaunch.label} (Delay: ${cueToLaunch.delay}s)`);
    lastMessageInfo.textContent = `Lançando Cue: ${cueToLaunch.cueNumber}. ${cueToLaunch.label}`;
    highlightCurrentCue(); // Garante que a cue que está a ser lançada está destacada

    clearTimeout(cuePlaybackTimeout); // Limpa qualquer timeout anterior
    cuePlaybackTimeout = setTimeout(() => {
        if (cueToLaunch.type === 'note') {
            sendNoteOn(cueToLaunch.midiChannel, cueToLaunch.midiNumber, cueToLaunch.value);
            // Envia Note Off logo após um pequeno delay para notas
            setTimeout(() => {
                sendNoteOff(cueToLaunch.midiChannel, cueToLaunch.midiNumber);
            }, 100); // Pequeno delay para garantir que a nota é acionada
        } else if (cueToLaunch.type === 'cc') {
            sendControlChange(cueToLaunch.midiChannel, cueToLaunch.midiNumber, cueToLaunch.value);
        }
    }, cueToLaunch.delay * 1000); // Converte segundos para milissegundos
}


/**
 * Avança para a próxima cue na lista e a lança.
 */
function goToNextCue() {
    clearTimeout(cuePlaybackTimeout); // Para qualquer playback em andamento

    if (cueList.length === 0) {
        console.warn('Go+: Nenhuma cue na lista para avançar.');
        return;
    }

    if (lastActionWasSelection) { // Se a última ação foi uma seleção manual...
        lastActionWasSelection = false; // Desativar o sinalizador para os próximos cliques
        // A cue já está selecionada, apenas a lançamos
        console.log(`Go+: Lançando cue selecionada: ${cueList[currentCueIndex]?.cueNumber}`);
    } else { // Se não foi uma seleção manual, avançamos normalmente
        // Se nenhuma cue estiver selecionada, ou já passou do final da lista,
        // define currentCueIndex para 0 para lançar a primeira cue.
        if (currentCueIndex === -1 || currentCueIndex >= cueList.length - 1) {
            currentCueIndex = 0; // Vai para a primeira cue se ainda não selecionou ou está na última
        } else {
            currentCueIndex++; // Avança o índice para a próxima cue
        }
        console.log(`Go+: Avançando para cue no índice: ${currentCueIndex}, Cue Number: ${cueList[currentCueIndex]?.cueNumber}`);
    }
    
    highlightCurrentCue(); // Destaca a nova cue selecionada
    updateCueNavButtonsState(); // Atualiza o estado dos botões de navegação
    
    // Lançar a cue ATUAL depois de avançar o índice (ou relançar a selecionada)
    launchCurrentCue();
}

/**
 * Retrocede para a cue anterior na lista e a lança.
 */
function goToPreviousCue() {
    clearTimeout(cuePlaybackTimeout); // Para qualquer playback em andamento

    if (cueList.length === 0) {
        console.warn('Go-: Nenhuma cue na lista para retroceder.');
        return;
    }

    if (lastActionWasSelection) { // Se a última ação foi uma seleção manual...
        lastActionWasSelection = false; // Desativar o sinalizador
        // A cue já está selecionada, apenas a lançamos
        console.log(`Go-: Lançando cue selecionada: ${cueList[currentCueIndex]?.cueNumber}`);
    } else { // Se não foi uma seleção manual, recuamos normalmente
        // Se nenhuma cue estiver selecionada, ou já está na primeira cue,
        // define currentCueIndex para a última cue, ou para 0 se só houver uma.
        if (currentCueIndex <= 0) {
            currentCueIndex = cueList.length > 0 ? cueList.length - 1 : 0; // Vai para a última cue, ou para 0 se vazia
            if (cueList.length === 0) {
                 currentCueIndex = -1; // Se a lista está vazia, resetar
                 console.warn('Go-: Nenhuma cue na lista.');
                 return;
            }
            console.log('Go-: Já na primeira cue. Recuando para a última ou relançando a primeira.');
        } else {
            currentCueIndex--; // Diminui o índice para a cue anterior
        }
        console.log(`Go-: Recuando para cue no índice: ${currentCueIndex}, Cue Number: ${cueList[currentCueIndex]?.cueNumber}`);
    }
    
    highlightCurrentCue(); // Destaca a nova cue selecionada
    updateCueNavButtonsState(); // Atualiza o estado dos botões de navegação
    
    // Lançar a cue ATUAL depois de recuar o índice (ou relançar a selecionada)
    launchCurrentCue();
}

// --- Funções do Novo Modal de Configuração de Cue ---
/**
 * Abre o modal de configuração para adicionar uma nova cue ou editar uma existente.
 * @param {Object} [cue=null] - O objeto cue a ser editado (opcional, para nova cue).
 * @param {number} [index=null] - O índice da cue a ser editado (opcional).
 */
function openCueConfigModal(cue = null, index = null) {
    closeConfigModal(); // Fecha o modal do deck se estiver aberto
    clearTimeout(cuePlaybackTimeout);

    currentEditingCue = cue;
    
    cueConfigLabel.value = cue ? cue.label : '';
    cueConfigType.value = cue ? cue.type : 'note';
    cueConfigMidiChannel.value = cue ? cue.midiChannel + 1 : 1;
    cueConfigMidiNumber.value = cue ? cue.midiNumber : 60;
    cueConfigValue.value = cue ? cue.value : 100;
    cueConfigDelay.value = cue ? cue.delay : 0;
    
    // Lógica para o novo Tipo de Mídia e Quantidade
    cueConfigMediaType.value = cue?.mediaType || 'audio'; // Define 'audio' como padrão se for nova
    cueConfigQuantity.value = 1; // Sempre 1 ao abrir para edição/criação única

    // Define a cor inicial baseada no tipo de mídia ou na cor da cue existente
    if (cue) { // Se estiver a editar, mantém a cor existente
        cueConfigColor.value = cue.color; 
    } else { // Se estiver a criar uma nova, define a cor baseada no tipo de mídia padrão
        applyMediaTypeColor(cueConfigMediaType.value);
    }
    
    if (cueConfigType.value === 'note') {
        cueConfigValueGroup.querySelector('label').textContent = 'Velocidade (1-127):';
        cueConfigValue.min = '1';
        cueConfigValue.max = '127';
        if (parseInt(cueConfigValue.value) === 0) cueConfigValue.value = '100';
    } else {
        cueConfigValueGroup.querySelector('label').textContent = 'Valor (0-127):';
        cueConfigValue.min = '0';
        cueConfigValue.max = '127';
    }

    saveCueConfigBtn.textContent = cue ? 'Salvar Cue' : 'Criar Cue(s)'; // Texto do botão muda
    saveCueConfigBtn.dataset.editingIndex = index !== null ? index : '';

    // Esconder/mostrar campos de quantidade e tipo de mídia para edição vs. criação
    if (cue) { // Se estiver em modo de edição
        cueConfigQuantity.parentElement.style.display = 'none'; // Esconde quantidade
        cueConfigMediaType.parentElement.style.display = 'none'; // Esconde tipo de mídia
    } else { // Se estiver a criar uma nova cue
        cueConfigQuantity.parentElement.style.display = 'block';
        cueConfigMediaType.parentElement.style.display = 'block';
    }

    cueConfigModal.style.display = 'flex';
}

// NOVO EVENT LISTENER para mudar a cor automaticamente
if (cueConfigMediaType) {
    cueConfigMediaType.addEventListener('change', (e) => {
        applyMediaTypeColor(e.target.value);
    });
}

// NOVA FUNÇÃO para aplicar a cor do tipo de mídia
function applyMediaTypeColor(mediaType) {
    switch (mediaType) {
        case 'audio':
            cueConfigColor.value = '#008800'; // Verde escuro para áudio
            break;
        case 'video':
            cueConfigColor.value = '#282828'; // Cinza escuro para vídeo
            break;
        case 'command':
            cueConfigColor.value = '#FF0000'; // Vermelho para comandos
            break;
        default:
            cueConfigColor.value = '#607d8b'; // Cor padrão se algo der errado
    }
}
/**
 * Fecha o modal de configuração de cue.
 */
function closeCueConfigModal() {
    cueConfigModal.style.display = 'none';
    currentEditingCue = null;
    saveCueConfigBtn.dataset.editingIndex = '';
}

// Event listener para mudança de tipo no modal de configuração de cue
cueConfigType.addEventListener('change', () => {
    if (cueConfigType.value === 'note') {
        cueConfigValueGroup.querySelector('label').textContent = 'Velocidade (1-127):';
        cueConfigValue.min = '1';
        cueConfigValue.max = '127';
        if (parseInt(cueConfigValue.value) === 0) cueConfigValue.value = '100';
    } else {
        cueConfigValueGroup.querySelector('label').textContent = 'Valor (0-127):';
        cueConfigValue.min = '0';
        cueConfigValue.max = '127';
    }
});

// Listener para salvar/criar a cue
if (saveCueConfigBtn) {
    saveCueConfigBtn.addEventListener('click', () => {
        const editingIndex = saveCueConfigBtn.dataset.editingIndex;
        
        const labelBase = cueConfigLabel.value.trim(); // Nome base fornecido pelo utilizador
        const type = cueConfigType.value;
        const midiChannel = parseInt(cueConfigMidiChannel.value) - 1; // 0-indexed
        let midiNumberBase = parseInt(cueConfigMidiNumber.value); // Será incrementado
        const value = parseInt(cueConfigValue.value);
        const delay = parseFloat(cueConfigDelay.value);
        const color = cueConfigColor.value;
        const mediaType = cueConfigMediaType.value; // Novo campo
        const quantity = parseInt(cueConfigQuantity.value); // Novo campo

        if (labelBase === '' && quantity > 1) {
            alert('Por favor, defina um nome base para as cues quando criar múltiplas.');
            return;
        }

        if (isNaN(midiChannel) || midiChannel < 0 || midiChannel > 15 ||
            isNaN(midiNumberBase) || midiNumberBase < 0 || midiNumberBase > 127 ||
            isNaN(value) || value < 0 || value > 127 ||
            isNaN(delay) || delay < 0 || isNaN(quantity) || quantity < 1) {
            alert('Por favor, preencha todos os campos numéricos corretamente.');
            return;
        }

        if (editingIndex !== '') {
            // MODO DE EDIÇÃO (apenas 1 cue de cada vez)
            const cue = cueList[parseInt(editingIndex)];
            cue.label = labelBase;
            cue.type = type;
            cue.midiChannel = midiChannel;
            cue.midiNumber = midiNumberBase; // Não incrementa em edição
            cue.value = value;
            cue.delay = delay;
            cue.color = color;
            // cue.mediaType = mediaType; // Não mudamos o tipo de mídia em edição simples
            console.log(`Cue ${cue.cueNumber} editada.`);
        } else {
            // MODO DE CRIAÇÃO (pode criar múltiplas cues)
            for (let i = 0; i < quantity; i++) {
                const cueNumber = generateNewCueNumber(); // Usa a nova lógica de numeração
                
                let cueLabel = labelBase;
                if (quantity > 1) { // Se estiver a criar múltiplas, adiciona número ao nome
                    if (labelBase === '') { // Se o nome base está vazio, usa o tipo de mídia
                        cueLabel = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} ${cueNumber}`; // Ex: Áudio 1, Vídeo 2
                    } else {
                        cueLabel = `${labelBase} ${cueNumber}`; // Ex: Música 1, Música 2
                    }
                }
                
                const newCue = {
                    cueNumber: cueNumber,
                    label: cueLabel,
                    type: type,
                    midiChannel: midiChannel,
                    midiNumber: midiNumberBase + i, // Incrementa o número MIDI para cada cue
                    value: value,
                    delay: delay,
                    color: color,
                    mediaType: mediaType // Salva o tipo de mídia
                };
                cueList.push(newCue);
                // currentCueIndex é o índice da última cue criada/selecionada.
                // Como adicionamos no final e reordenamos, o novo índice pode mudar.
                // A ordenação é feita no loadCueList.
                console.log(`Cue ${newCue.cueNumber} criada.`);
            }
        }
        
        saveCueList();
        loadCueList(); // Recarrega e renderiza a lista para garantir a ordem correta
        // Após carregar e renderizar, tentamos selecionar a cue que estava ativa ou a primeira.
        if (editingIndex !== '') {
            selectCue(parseInt(editingIndex)); // Tenta re-selecionar a cue editada
        } else if (cueList.length > 0) {
             // Se criou novas, seleciona a última criada para que o "GO" funcione a partir dela
             // Ou a primeira se a lista estava vazia
            currentCueIndex = cueList.length - 1; 
            highlightCurrentCue();
        } else {
            currentCueIndex = -1;
        }
        
        closeCueConfigModal();
        updateCueNavButtonsState();
    });
}

// Event listener para fechar o modal de configuração de cue
closeCueConfigModalBtn.addEventListener('click', closeCueConfigModal);


// --- Gestão de Abas ---
/**
 * Abre a aba especificada e atualiza o estado dos elementos.
 * @param {string} tabName - O nome da aba a ser aberta.
 */
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tabContent => {
        tabContent.classList.remove('active');
    });
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(tabName + 'Tab').classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');

    currentActiveTab = tabName;

    // Atualiza o estado de todos os botões no DOM para refletir a aba ativa e o modo de edição
    Object.keys(customDeckGrids).forEach(deckTab => {
        updateButtonStates(deckTab);
    });
    // Garante que o botão de toggle do modo de edição esteja correto
    if (toggleEditModeBtns[currentActiveTab]) { // Verifica se existe (não existe para Cue List)
        toggleEditModeBtns[currentActiveTab].textContent = editModes[currentActiveTab] ? 'Desativar Modo de Edição' : 'Ativar Modo de Edição';
    }

    // Lógica específica para a Cue List ao abrir a aba
    if (tabName === 'cueList') {
        renderCueList();
        updateCueNavButtonsState();
    }
}


// --- Funções de Limpeza ---

/**
 * Reseta a configuração de um deck específico para o estado inicial (não configurado).
 * @param {string} tabName - O nome da aba (e do deck) a ser limpo.
 */
function clearCustomDeck(tabName) {
    if (confirm(`Tem certeza que deseja limpar o Deck "${tabName.replace('customDeck', 'Deck ')}" e apagar todas as configurações? Esta ação é irreversível!`)) {
        customDeckConfigs[tabName] = []; // Zera a configuração
        localStorage.removeItem(`customDeckConfig_${tabName}`); // Remove do localStorage
        createCustomDeck(tabName); // Recria os botões com as configurações padrão
        updateButtonStates(tabName); // Atualiza o estado visual
        console.log(`Deck "${tabName}" limpo.`);
    }
}

/**
 * Limpa toda a lista de cues.
 */
function clearCueList() {
    if (confirm('Tem certeza que deseja apagar TODAS as cues? Esta ação é irreversível!')) {
        cueList = []; // Zera a lista de cues
        currentCueIndex = -1; // Reseta o índice da cue ativa
        localStorage.removeItem('cueList'); // Remove do localStorage
        renderCueList(); // Re-renderiza a lista (agora vazia)
        updateCueNavButtonsState(); // Atualiza o estado dos botões de navegação
        console.log('Cue List limpa.');
    }
}


// --- Event Listeners Globais ---
// Event listener para o botão de conectar
connectBtn.addEventListener('click', connectWebSocket);

// Event listeners para os botões de aba
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        openTab(button.dataset.tab);
    });
});

// Event listeners para os botões de "Ativar Modo de Edição" de cada Deck
// Certifique-se de que estes listeners são adicionados apenas uma vez
const setupDeckEditModeListeners = () => {
    Object.keys(toggleEditModeBtns).forEach(deckId => {
        const btn = toggleEditModeBtns[deckId];
        // Evita adicionar o listener múltiplas vezes se o script for executado várias vezes
        if (!btn.dataset.listenerAdded) {
            btn.addEventListener('click', () => {
                editModes[deckId] = !editModes[deckId];
                openTab(deckId); // Reabre a aba para aplicar o estilo de edição
                console.log(`Modo de Edição do ${deckId} ${editModes[deckId] ? 'ATIVADO' : 'DESATIVADO'}.`);
            });
            btn.dataset.listenerAdded = 'true';
        }
    });
};


// Event Listeners para a CUE LIST
if (addCueBtn) {
    addCueBtn.addEventListener('click', () => openCueConfigModal());
}
if (goNextCueBtn) {
    // CORREÇÃO AQUI: O botão GO da interface agora também AVANÇA E LANÇA
    goNextCueBtn.addEventListener('click', goToNextCue); 
}
if (goPrevCueBtn) {
    goPrevCueBtn.addEventListener('click', goToPreviousCue);
}
if (clearCueListBtn) {
    clearCueListBtn.addEventListener('click', clearCueList);
}


// Event Listeners para os botões Limpar Deck
if (clearDeckBtn1) {
    clearDeckBtn1.addEventListener('click', () => clearCustomDeck('customDeck1'));
}
if (clearDeckBtn2) {
    clearDeckBtn2.addEventListener('click', () => clearCustomDeck('customDeck2'));
}
if (clearDeckBtn3) {
    clearDeckBtn3.addEventListener('click', () => clearCustomDeck('customDeck3'));
}


// Atalhos de teclado para a Cue List
document.addEventListener('keydown', (e) => {
    if (currentActiveTab === 'cueList') {
        if (e.code === 'Space' && !e.shiftKey) {
            e.preventDefault();
            // Barra de Espaço chama goToNextCue (AVANÇA E LANÇA)
            goToNextCue(); 
        } else if (e.code === 'Space' && e.shiftKey) {
            e.preventDefault();
            // Shift + Espaço chama goToPreviousCue (RECUA E LANÇA)
            goToPreviousCue();
        }
    }
});


// Prevenir context menu nos botões
document.addEventListener('contextmenu', (e) => {
    if (e.target.classList.contains('custom-deck-button') || e.target.closest('.custom-deck-button') ||
        e.target.classList.contains('cue-item') || e.target.closest('.cue-item')) {
        e.preventDefault();
    }
});

// Release all active notes when window loses focus or beforeunload
window.addEventListener('blur', () => {
    for (const buttonId of activeButtons) {
        const [tabName, indexStr] = buttonId.split('-');
        const index = parseInt(indexStr);
        const config = customDeckConfigs[tabName][index];
        const button = customDeckGrids[tabName].children[index];

        if (config && config.type === 'note' && ws && ws.readyState === WebSocket.OPEN) {
            sendNoteOff(config.midiChannel, config.midiNumber);
            if (button) button.classList.remove('active');
        }
    }
    activeButtons.clear();
    clearTimeout(cuePlaybackTimeout);
});

window.addEventListener('beforeunload', () => {
    for (const buttonId of activeButtons) {
        const [tabName, indexStr] = buttonId.split('-');
        const index = parseInt(indexStr);
        const config = customDeckConfigs[tabName][index];
        if (config && config.type === 'note' && ws && ws.readyState === WebSocket.OPEN) {
            sendNoteOff(config.midiChannel, config.midiNumber);
        }
    }
    clearTimeout(cuePlaybackTimeout);
});


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    configModal.style.display = 'none';
    cueConfigModal.style.display = 'none';

    // Carregar IP salvo do localStorage, se existir
    const savedIp = localStorage.getItem('websocketIp');
    if (savedIp) {
        const ipParts = savedIp.split('.');
        if (ipParts.length === 4) {
            ipPart1.value = ipParts[0];
            ipPart2.value = ipParts[1];
            ipPart3.value = ipParts[2];
            ipPart4.value = ipParts[3];
        }
    }

    // Event listeners para salvar o IP automaticamente
    document.querySelectorAll('.ip-part').forEach(input => {
        input.addEventListener('input', () => {
            const currentIp = `${ipPart1.value}.${ipPart2.value}.${ipPart3.value}.${ipPart4.value}`;
            localStorage.setItem('websocketIp', currentIp);
        });
    });

    // Criar os botões para cada deck
    Object.keys(customDeckGrids).forEach(tabName => {
        createCustomDeck(tabName);
    });

    // Configura os listeners para os botões de modo de edição (feito uma única vez)
    setupDeckEditModeListeners();

    // Carregar e renderizar a Cue List
    loadCueList();

    connectBtn.disabled = false;
    statusDiv.textContent = 'Aguardando conexão...';
    statusDiv.className = 'status disconnected';
    
    // Abre a primeira aba por padrão
    openTab(currentActiveTab);
});