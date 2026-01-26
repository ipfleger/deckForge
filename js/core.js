// ========================================
// CORE CONFIGURATION & STATE
// ========================================

window.DeckForge = window.DeckForge || {};

(function() {
    'use strict';

    // CONSTANTS
    DeckForge.CARD_WIDTH = 750;
    DeckForge.CARD_HEIGHT = 1050;
    DeckForge.BLEED_MARGIN = 37;
    DeckForge.SAFE_MARGIN = 75;
    DeckForge.MAX_HISTORY_LENGTH = 10;
    DeckForge.DEBOUNCE_DELAY = 100;
    DeckForge.ZOOM_MIN = 0.1;
    DeckForge.ZOOM_MAX = 5;

    DeckForge.SAVE_PROPS = [
        'roleFill', 'roleStroke', 'locked',
        'roleGradientStart', 'roleGradientEnd', 'gradBalance',
        'isParticleGroup', 'generativeType',
        'clipPath', 'id', '_uiId' // Added internal IDs for layers
    ];

    DeckForge.DEFAULT_PALETTES = [
        { id:'corporate', name:'Breach', colors:['#ddfff7', '#93e1d8', '#ffa69e', '#aa4465', '#191919', '#5c2d4f', '#f0a6ca', '#b8e0d2'] },
        { id:'sunset', name:'Sunset', colors:['#fff7ed', '#fed7aa', '#fdba74', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#431407'] },
        { id:'forest', name:'Forest', colors:['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#22c55e', '#15803d', '#166534', '#052e16'] },
        { id:'berry', name:'Berry', colors:['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899', '#db2777', '#be185d', '#831843'] },
        { id:'cyber', name:'Cyber', colors:['#f0f9ff', '#e0f2fe', '#22d3ee', '#0ea5e9', '#0284c7', '#6366f1', '#4f46e5', '#1e1b4b'] },
        { id:'mono', name:'Monochrome', colors:['#ffffff', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#171717'] }
    ];

    DeckForge.FONT_OPTIONS = [
        { name:'Lost Mono', val:'lost_mono' },
        { name:'Inter', val:'Inter' },
        { name:'Roboto', val:'Roboto' },
        { name:'Merriweather', val:'Merriweather' },
        { name:'Playfair', val:'Playfair Display' },
        { name:'Oswald', val:'Oswald' },
        { name:'Lobster', val:'Lobster' },
        { name:'Dancing Script', val:'Dancing Script' },
        { name:'Courier', val:'Courier Prime' },
        { name:'Monoton', val:'Monoton' },
        { name:'Cinzel (Fantasy)', val:'Cinzel' },
        { name:'Orbitron (Sci-Fi)', val:'Orbitron' },
        { name:'Bangers (Comic)', val:'Bangers' },
        { name:'Georama (Geom)', val:'Georama' },
        { name:'Rajdhani (Tech)', val:'Rajdhani' },
        { name:'Chakra Petch (Mech)', val:'Chakra Petch' },
        { name:'Audiowide (Cyber)', val:'Audiowide' },
        { name:'Cormorant (Elegant)', val:'Cormorant Garamond' },
        { name:'Crimson (Classic)', val:'Crimson Text' },
        { name:'Montserrat', val:'Montserrat' },
        { name:'Open Sans', val:'Open Sans' },
        { name:'Lato', val:'Lato' },
        { name:'Poppins', val:'Poppins' },
        { name:'Raleway', val:'Raleway' },
        { name:'Ubuntu', val:'Ubuntu' },
        { name:'Nunito', val:'Nunito' },
        { name:'Rubik', val:'Rubik' },
        { name:'Quicksand', val:'Quicksand' }
    ];

    DeckForge.BLEND_MODES = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];

    // GLOBAL STATE
    DeckForge.state = {
        palette: DeckForge.DEFAULT_PALETTES[0].colors,
        palettes: [...DeckForge.DEFAULT_PALETTES],
        coordinatedColors: true,
        darkMode: false,
        editMode: 'fill',
        gradSlot: 'start',
        history: [],
        redoStack: [],
        isProcessing: false,
        scale: 0.8,
        panX: 0,
        panY: 0,
        activePattern: null
    };

    DeckForge.canvas = null; // Reference placeholder
})();
