/**
 * ウマ娘 なんでもSHAKEROCKメーカー - アプリケーションロジック
 * @author @nyaftama
 * @version 1.02
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素 ---
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const pasteImgBtn = document.getElementById('pasteImgBtn');
    const resetImgBtn = document.getElementById('resetImgBtn');

    const canvasWorkspace = document.getElementById('canvasWorkspace');
    const mainCanvas = document.getElementById('mainCanvas');
    const mainCtx = mainCanvas.getContext('2d');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const overlayCtx = overlayCanvas.getContext('2d');
    const brushCursor = document.getElementById('brushCursor');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const salmonDragToggleRow = document.getElementById('salmonDragToggleRow');
    const logoDragToggleRow = document.getElementById('logoDragToggleRow');
    const cropToggleRow = document.getElementById('cropToggleRow');
    const maskToolToggleRow = document.getElementById('maskToolToggleRow');
    const maskUndoToggleRow = document.getElementById('maskUndoToggleRow');
    const dragHintOverlay = document.getElementById('dragHintOverlay');
    const logoEnableToggleRow = document.getElementById('logoEnableToggleRow');
    const subtitleEnableToggleRow = document.getElementById('subtitleEnableToggleRow');
    const overlaySelectors = document.querySelectorAll('.canvas-overlay-drag-selector');
    const dragModeRadioInputs = document.querySelectorAll('input[name="salmonDragMode"]');
    const logoDragModeRadioInputs = document.querySelectorAll('input[name="logoDragMode"]');
    const maskToolRadioInputs = document.querySelectorAll('input[name="maskToolMode"]');
    const fishTypeRadioInputs = document.querySelectorAll('input[name="fishType"]');

    // 切り抜きアスペクト比ドロップダウン要素
    const aspectDropdown = document.getElementById('aspectDropdown');
    const aspectDropdownTrigger = document.getElementById('aspectDropdownTrigger');
    const aspectSelectedIcon = document.getElementById('aspectSelectedIcon');
    const aspectSelectedText = document.getElementById('aspectSelectedText');
    const aspectDropdownMenu = document.getElementById('aspectDropdownMenu');

    // ツールカード
    const logoToolsCard = document.getElementById('logoToolsCard');
    const eraserToolsCard = document.getElementById('eraserToolsCard');
    const fishToolsCard = document.getElementById('fishToolsCard');

    // ブラシ設定要素
    const brushSizeInput = document.getElementById('brushSize');
    const brushSizeVal = document.getElementById('brushSizeVal');
    const undoEraseBtn = document.getElementById('undoEraseBtn');
    const clearEraseBtn = document.getElementById('clearEraseBtn');

    // ロゴ設定要素
    const logoShowInput = document.getElementById('logoShow');
    const logoLine1Input = document.getElementById('logoLine1');
    const logoLine2Input = document.getElementById('logoLine2');
    const logoScaleInput = document.getElementById('logoScale');
    const logoScaleVal = document.getElementById('logoScaleVal');
    const resetLogoBtn = document.getElementById('resetLogoBtn');

    // 字幕設定要素
    const subtitleToolsCard = document.getElementById('subtitleToolsCard');
    const subtitleShowInput = document.getElementById('subtitleShow');
    const subtitleLine1Input = document.getElementById('subtitleLine1');
    const subtitleLine2Input = document.getElementById('subtitleLine2');
    const subtitleScaleInput = document.getElementById('subtitleScale');
    const subtitleScaleVal = document.getElementById('subtitleScaleVal');
    const resetSubtitleBtn = document.getElementById('resetSubtitleBtn');

    // おさかな設定要素
    const salmonScaleInput = document.getElementById('salmonScale');
    const salmonScaleVal = document.getElementById('salmonScaleVal');
    const salmonRotZInput = document.getElementById('salmonRotZ');
    const salmonRotZVal = document.getElementById('salmonRotZVal');
    const salmonBulgeInput = document.getElementById('salmonBulge');
    const salmonBulgeVal = document.getElementById('salmonBulgeVal');
    const lightColorDropdown = document.getElementById('lightColorDropdown');
    const lightColorDropdownTrigger = document.getElementById('lightColorDropdownTrigger');
    const lightColorSelectedIcon = document.getElementById('lightColorSelectedIcon');
    const lightColorSelectedText = document.getElementById('lightColorSelectedText');
    const lightColorDropdownMenu = document.getElementById('lightColorDropdownMenu');
    const customLightColorInput = document.getElementById('customLightColorInput');
    const resetSalmonBtn = document.getElementById('resetSalmonBtn');

    // エクスポート・モーダル要素
    const generateBtn = document.getElementById('generateBtn');
    const resultModal = document.getElementById('resultModal');
    const modalLoading = document.getElementById('modalLoading');
    const modalBodyContent = document.getElementById('modalBodyContent');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const twitterShareBtn = document.getElementById('twitterShareBtn');
    const copyImgBtn = document.getElementById('copyImgBtn');
    const toast = document.getElementById('toast');

    const MAX_IMAGE_DIMENSION = 1920; // 画像の最大解像度
    const FALLBACK_NG_WORDS_B64 = "";
    let brushPreviewTimeout;
    let currentAspectKey = 'original';

    // --- NGワード判定・英字入力バリデーション ---
    let ngWords = [];
    let isNgWordDetected = false;

    function decodeTripleBase64(b64Str) {
        try {
            const cleanStr = String(b64Str).replace(/\s+/g, '');
            const pass1 = atob(cleanStr).replace(/\s+/g, '');
            const pass2 = atob(pass1).replace(/\s+/g, '');
            const pass3Binary = atob(pass2);
            const bytes = new Uint8Array(pass3Binary.length);
            for (let j = 0; j < pass3Binary.length; j++) {
                bytes[j] = pass3Binary.charCodeAt(j);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.warn('Failed to decode Base64:', e);
            return '';
        }
    }

    async function loadNgWords() {
        let loadedText = '';
        try {
            const versionBadge = document.querySelector('.version-badge');
            const version = versionBadge ? versionBadge.textContent.trim().replace(/^v/, '') : '';
            const fetchUrl = version ? `data/ng_words.txt?v=${version}` : 'data/ng_words.txt';
            const response = await fetch(fetchUrl);
            if (response.ok) {
                const rawText = await response.text();
                loadedText = decodeTripleBase64(rawText);
            }
        } catch (err) {
            console.warn('Could not fetch ng_words.txt:', err);
        }

        if (!loadedText && FALLBACK_NG_WORDS_B64) {
            loadedText = decodeTripleBase64(FALLBACK_NG_WORDS_B64);
        }

        if (loadedText) {
            ngWords = loadedText
                .split(/\r?\n/)
                .map(w => w.trim())
                .filter(w => w.length > 0 && !w.includes('\uFFFD') && /^[\u3040-\u30FF\u4E00-\u9FAF\uFF00-\uFFEF\w]+$/u.test(w));
        }

        validateAllInputs();
    }

    function normalizeText(str) {
        if (!str) return '';
        let normalized = str.normalize('NFKC').toLowerCase();
        return normalized.replace(/[\u30a1-\u30f6]/g, (ch) => {
            return String.fromCharCode(ch.charCodeAt(0) - 0x60);
        });
    }

    function hasEmoji(str) {
        if (!str) return false;
        try {
            if (/\p{Extended_Pictographic}/u.test(str)) {
                return true;
            }
        } catch (e) { }

        const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}]/u;
        return emojiRegex.test(str);
    }

    function checkTextError(text) {
        if (!text || text.trim().length === 0) return { error: false, type: null };
        if (hasEmoji(text)) return { error: true, type: 'emoji' };

        if (ngWords.length > 0) {
            const normalizedText = normalizeText(text);
            for (const word of ngWords) {
                const normalizedWord = normalizeText(word);
                if (normalizedWord && normalizedText.includes(normalizedWord)) {
                    return { error: true, type: 'ng' };
                }
            }
        }
        return { error: false, type: null };
    }

    function validateAllInputs() {
        const logoLine1 = logoState.line1 || '';
        const logoLine2 = logoState.line2 || '';

        const logoLine1Result = checkTextError(logoLine1);
        const logoLine2Result = checkTextError(logoLine2);
        const logoCombinedResult = checkTextError((logoLine1 + logoLine2).replace(/\s+/g, ''));

        const subLine1 = subtitleState.line1 || '';
        const subLine2 = subtitleState.line2 || '';

        const subLine1Result = checkTextError(subLine1);
        const subLine2Result = checkTextError(subLine2);
        const subCombinedResult = checkTextError((subLine1 + subLine2).replace(/\s+/g, ''));

        const logoError = logoLine1Result.error || logoLine2Result.error || logoCombinedResult.error;
        const subError = subLine1Result.error || subLine2Result.error || subCombinedResult.error;

        isNgWordDetected = logoError || subError;

        const logoLine1ErrorEl = document.getElementById('logoLine1Error');
        const logoLine2ErrorEl = document.getElementById('logoLine2Error');

        if (logoLine1Input) {
            if (logoLine1Result.error || (logoCombinedResult.error && !logoLine2Result.error)) {
                logoLine1Input.classList.add('input-error');
                if (logoLine1ErrorEl) {
                    logoLine1ErrorEl.style.display = 'flex';
                    const span = logoLine1ErrorEl.querySelector('span');
                    if (span) span.textContent = logoLine1Result.type === 'emoji' ? '絵文字は使用できません' : '不適切な文字または表現が含まれています';
                }
            } else {
                logoLine1Input.classList.remove('input-error');
                if (logoLine1ErrorEl) logoLine1ErrorEl.style.display = 'none';
            }
        }

        if (logoLine2Input) {
            if (logoLine2Result.error) {
                logoLine2Input.classList.add('input-error');
                if (logoLine2ErrorEl) {
                    logoLine2ErrorEl.style.display = 'flex';
                    const span = logoLine2ErrorEl.querySelector('span');
                    if (span) span.textContent = logoLine2Result.type === 'emoji' ? '絵文字は使用できません' : '不適切な文字または表現が含まれています';
                }
            } else {
                logoLine2Input.classList.remove('input-error');
                if (logoLine2ErrorEl) logoLine2ErrorEl.style.display = 'none';
            }
        }

        const subLine1ErrorEl = document.getElementById('subtitleLine1Error');
        const subLine2ErrorEl = document.getElementById('subtitleLine2Error');

        if (subtitleLine1Input) {
            if (subLine1Result.error || (subCombinedResult.error && !subLine2Result.error)) {
                subtitleLine1Input.classList.add('input-error');
                if (subLine1ErrorEl) {
                    subLine1ErrorEl.style.display = 'flex';
                    const span = subLine1ErrorEl.querySelector('span');
                    if (span) span.textContent = subLine1Result.type === 'emoji' ? '絵文字は使用できません' : '不適切な文字または表現が含まれています';
                }
            } else {
                subtitleLine1Input.classList.remove('input-error');
                if (subLine1ErrorEl) subLine1ErrorEl.style.display = 'none';
            }
        }

        if (subtitleLine2Input) {
            if (subLine2Result.error) {
                subtitleLine2Input.classList.add('input-error');
                if (subLine2ErrorEl) {
                    subLine2ErrorEl.style.display = 'flex';
                    const span = subLine2ErrorEl.querySelector('span');
                    if (span) span.textContent = subLine2Result.type === 'emoji' ? '絵文字は使用できません' : '不適切な文字または表現が含まれています';
                }
            } else {
                subtitleLine2Input.classList.remove('input-error');
                if (subLine2ErrorEl) subLine2ErrorEl.style.display = 'none';
            }
        }

        requestRender();
    }

    loadNgWords();

    // キャンバスオーバーレイ要素でのイベント伝播防止
    overlaySelectors.forEach(overlay => {
        ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'click'].forEach(eventType => {
            overlay.addEventListener(eventType, (e) => {
                e.stopPropagation();
            });
        });
    });

    // Permanent Marker フォント読み込み完了時の再描画
    if (document.fonts) {
        document.fonts.load("900 48px 'Permanent Marker'").then(() => {
            requestRender();
        }).catch(() => { });
    }

    // エディター位置へのスムーズスクロール
    function scrollToEditor() {
        const editorCard = canvasWorkspace ? (canvasWorkspace.closest('.card') || canvasWorkspace) : null;
        if (editorCard) {
            const offset = 24;
            const elementPosition = editorCard.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = Math.max(0, elementPosition - offset);

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    // 高解像度画像のリサイズ処理（長辺最大1920px）
    function resizeImageIfNeeded(img) {
        const maxDim = Math.max(img.width, img.height);
        if (maxDim <= MAX_IMAGE_DIMENSION) {
            return Promise.resolve(img);
        }

        const scale = MAX_IMAGE_DIMENSION / maxDim;
        const targetWidth = Math.round(img.width * scale);
        const targetHeight = Math.round(img.height * scale);

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = targetWidth;
        offscreenCanvas.height = targetHeight;
        const ctx = offscreenCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const resizedImg = new Image();
        return new Promise((resolve) => {
            resizedImg.onload = () => resolve(resizedImg);
            resizedImg.src = offscreenCanvas.toDataURL('image/png');
        });
    }

    // --- 鰹の削り節エフェクトパーティクル ---
    let bonitoParticles = [];
    let isParticleLoopRunning = false;

    function spawnBonitoFlakes(x, y, actualBrushSize) {
        const count = 2 + Math.floor(Math.random() * 2);
        const colors = [
            'rgba(215, 120, 70, 0.85)',
            'rgba(190, 85, 40, 0.8)',
            'rgba(235, 150, 95, 0.85)',
            'rgba(175, 75, 30, 0.8)'
        ];

        const baseDim = bgImage ? Math.max(bgImage.width, bgImage.height) : (mainCanvas.width ? Math.max(mainCanvas.width, mainCanvas.height) : 800);
        const resScale = baseDim / 800;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.8 + Math.random() * 2.2) * resScale;
            const spread = (actualBrushSize / 2) * (0.2 + Math.random() * 0.8);

            bonitoParticles.push({
                x: x + Math.cos(angle) * spread,
                y: y + Math.sin(angle) * spread,
                vx: Math.cos(angle) * speed * 0.4 + (Math.random() - 0.5) * 1.2 * resScale,
                vy: Math.sin(angle) * speed * 0.4 - (1.2 + Math.random() * 1.5) * resScale,
                gravity: 0.12 * resScale,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.25,
                size: (0.007 + Math.random() * 0.010) * baseDim,
                scaleX: 1.0 + (Math.random() - 0.5) * 0.4,
                scaleY: 0.4 + (Math.random() - 0.5) * 0.2,
                life: 1.0,
                decay: 0.035 + Math.random() * 0.025,
                alpha: 0.8 + Math.random() * 0.2,
                color: colors[Math.floor(Math.random() * colors.length)],
                resScale: resScale
            });
        }

        if (!isParticleLoopRunning) {
            isParticleLoopRunning = true;
            requestAnimationFrame(updateAndRenderParticles);
        }
    }

    function updateAndRenderParticles() {
        if (bonitoParticles.length === 0) {
            isParticleLoopRunning = false;
            renderOverlay();
            return;
        }

        for (let i = bonitoParticles.length - 1; i >= 0; i--) {
            const p = bonitoParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += (p.gravity || 0.12);
            p.vx *= 0.96;
            p.rot += p.vRot;
            p.life -= p.decay;

            if (p.life <= 0) {
                bonitoParticles.splice(i, 1);
            }
        }

        renderOverlay();

        if (bonitoParticles.length > 0) {
            requestAnimationFrame(updateAndRenderParticles);
        } else {
            isParticleLoopRunning = false;
        }
    }

    function drawBonitoFlake(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.scaleX, p.scaleY);
        ctx.globalAlpha = Math.max(0, p.life * p.alpha);

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 220, 180, 0.45)';
        ctx.lineWidth = Math.max(1, (p.resScale || 1));
        ctx.stroke();

        ctx.restore();
    }

    // --- おさかなアセット定義 ---
    const FISH_CONFIGS = {
        tuna: {
            name: 'Thisマグロ',
            src: 'images/tuna.png'
        },
        salmon: {
            name: 'シャケ',
            src: 'images/salmon.png'
        }
    };

    let currentFishType = 'tuna';
    const fishCache = {};
    let isSalmonLoaded = false;

    // --- アプリケーション状態 ---
    let bgImage = null;
    let salmonAspect = 2.0;

    let salmonEraseCanvas = document.createElement('canvas');
    let salmonEraseCtx = salmonEraseCanvas.getContext('2d');

    let currentMode = 'crop';
    let salmonDragMode = 'move';
    let logoDragMode = 'move';
    let currentTool = 'erase';
    let brushSizePct = 5.0;
    let brushShape = 'circle'; // 'circle' | 'square' | 'triangle' | 'triangle-down'
    let isDrawing = false;
    let isDragTargetHit = false;
    let activeDragAction = 'none'; // 'none' | 'move' | 'resize' | 'rotate'
    let initialResizeDist = 0;
    let initialResizeScale = 1.0;
    let hoveredHandle = null;
    let lastDrawPos = null;
    let lastScreenPos = null;

    let bgOffsetX = 0;
    let bgOffsetY = 0;

    let tempCompositeCanvas = document.createElement('canvas');
    let tempCompositeCtx = tempCompositeCanvas.getContext('2d');
    let tempSalmonCanvas = document.createElement('canvas');
    let tempSalmonCtx = tempSalmonCanvas.getContext('2d');
    let contourOffCanvas = document.createElement('canvas');
    let contourOffCtx = contourOffCanvas.getContext('2d');

    const salmonState = {
        x: 0,
        y: 0,
        scale: 1.0,
        bulge: 0.35,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        handleRotZ: 0
    };

    const logoState = {
        visible: true,
        line1: 'SHAKE',
        line2: 'ROCK',
        x: 0,
        y: 0,
        scale: 1.0,
        rotZ: -10,
        handleRotZ: 10
    };

    let isFirstTimeSubtitleTurnedOn = false;

    const subtitleState = {
        visible: true,
        line1: 'シャケシャケナー！シャケシャケナー！',
        line2: '',
        x: 0,
        y: 0,
        scale: 1.0
    };

    // --- Three.js 初期化 ---
    let threeScene, threeCamera, threeRenderer;
    let ambientLight, dirLight;
    let activeSalmonGroup = null;
    let threeCanvas = document.createElement('canvas');

    initThreeJS();
    loadDemoImage();

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            requestRender();
        });
    }

    loadFishAsset('tuna', () => {
        loadFishAsset('salmon');
    });

    function getActualBrushPixelSize() {
        if (!mainCanvas.width) return 30;
        const baseDim = Math.max(mainCanvas.width, mainCanvas.height);
        return Math.max(2, (brushSizePct / 100) * baseDim);
    }

    function requestRender() {
        renderAll();
        requestAnimationFrame(() => {
            renderAll();
        });
    }

    function initThreeJS() {
        threeScene = new THREE.Scene();
        threeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
        threeCamera.position.z = 10;

        threeRenderer = new THREE.WebGLRenderer({
            canvas: threeCanvas,
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true
        });
        threeRenderer.setClearColor(0x000000, 0);

        ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
        threeScene.add(ambientLight);

        dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 5, 10);
        threeScene.add(dirLight);
    }

    function loadFishAsset(type, onComplete) {
        if (fishCache[type]) {
            if (onComplete) onComplete();
            return;
        }

        const config = FISH_CONFIGS[type];
        const loader = new THREE.TextureLoader();
        loader.load(
            config.src,
            (texture) => {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;

                const img = texture.image;
                const aspect = img.width / img.height;

                const flippedCanvas = document.createElement('canvas');
                flippedCanvas.width = img.width;
                flippedCanvas.height = img.height;
                const fCtx = flippedCanvas.getContext('2d');
                fCtx.translate(img.width, 0);
                fCtx.scale(-1, 1);
                fCtx.drawImage(img, 0, 0);

                const textureBack = new THREE.CanvasTexture(flippedCanvas);
                textureBack.minFilter = THREE.LinearFilter;
                textureBack.magFilter = THREE.LinearFilter;

                const distCanvasFront = generateDistanceTransformCanvas(img);
                const distanceTextureFront = new THREE.CanvasTexture(distCanvasFront);
                distanceTextureFront.minFilter = THREE.LinearFilter;
                distanceTextureFront.magFilter = THREE.LinearFilter;

                const distCanvasBack = document.createElement('canvas');
                distCanvasBack.width = distCanvasFront.width;
                distCanvasBack.height = distCanvasFront.height;
                const dbCtx = distCanvasBack.getContext('2d');
                dbCtx.translate(distCanvasFront.width, 0);
                dbCtx.scale(-1, 1);
                dbCtx.drawImage(distCanvasFront, 0, 0);

                const distanceTextureBack = new THREE.CanvasTexture(distCanvasBack);
                distanceTextureBack.minFilter = THREE.LinearFilter;
                distanceTextureBack.magFilter = THREE.LinearFilter;

                const group = build3DFishGroup(aspect, texture, textureBack, distanceTextureFront, distanceTextureBack);

                fishCache[type] = {
                    aspect: aspect,
                    group: group
                };

                if (type === currentFishType) {
                    activateFishType(type);
                }

                if (onComplete) onComplete();
            },
            undefined,
            (err) => {
                console.error(`Failed to load fish asset ${config.src}:`, err);
            }
        );
    }

    function build3DFishGroup(aspect, textureFront, textureBack, distFront, distBack) {
        const meshWidth = 2 * aspect;
        const meshHeight = 2;

        const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight, 128, 128);

        const frontMaterial = new THREE.MeshStandardMaterial({
            map: textureFront,
            displacementMap: distFront,
            displacementScale: salmonState.bulge,
            transparent: true,
            alphaTest: 0.2,
            roughness: 0.35,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const backMaterial = new THREE.MeshStandardMaterial({
            map: textureBack,
            displacementMap: distBack,
            displacementScale: salmonState.bulge,
            transparent: true,
            alphaTest: 0.2,
            roughness: 0.35,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        const frontMesh = new THREE.Mesh(geometry, frontMaterial);
        frontMesh.position.z = 0.0001;

        const backMesh = new THREE.Mesh(geometry, backMaterial);
        backMesh.rotation.y = Math.PI;
        backMesh.position.z = -0.0001;

        const group = new THREE.Group();
        group.add(frontMesh);
        group.add(backMesh);

        return group;
    }

    function activateFishType(type) {
        currentFishType = type;

        if (!fishCache[type]) {
            loadFishAsset(type);
            return;
        }

        if (activeSalmonGroup) {
            threeScene.remove(activeSalmonGroup);
        }

        const fishData = fishCache[type];
        salmonAspect = fishData.aspect;
        activeSalmonGroup = fishData.group;
        threeScene.add(activeSalmonGroup);

        const diag = Math.sqrt(salmonAspect * salmonAspect + 1.0);
        const cameraBound = diag * 1.15;

        threeCamera.left = -cameraBound;
        threeCamera.right = cameraBound;
        threeCamera.top = cameraBound;
        threeCamera.bottom = -cameraBound;
        threeCamera.updateProjectionMatrix();

        isSalmonLoaded = true;

        if (!bgImage) {
            loadDemoImage();
        }

        const currentPct = parseInt(salmonScaleInput.value, 10) || 100;
        const baseScale = getBaseSalmonScale(bgImage.width);
        salmonState.scale = (currentPct / 100) * baseScale;

        requestRender();
        setTimeout(() => requestRender(), 100);
        setTimeout(() => requestRender(), 300);
    }

    // --- 輪郭立体化用ディスタンスマップ生成 ---
    function generateDistanceTransformCanvas(img) {
        const width = img.width;
        const height = img.height;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width;
        srcCanvas.height = height;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, 0, 0);

        const imgData = srcCtx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const scale = Math.min(1.0, 300 / Math.max(width, height));
        const sw = Math.round(width * scale);
        const sh = Math.round(height * scale);

        const grid = new Float32Array(sw * sh);

        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const origX = Math.floor(x / scale);
                const origY = Math.floor(y / scale);
                const alpha = data[(origY * width + origX) * 4 + 3];

                if (alpha < 50) {
                    grid[y * sw + x] = 0;
                } else {
                    grid[y * sw + x] = 1e6;
                }
            }
        }

        for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
                const idx = y * sw + x;
                let d = grid[idx];
                if (d === 0) continue;

                if (x > 0) d = Math.min(d, grid[idx - 1] + 1);
                if (y > 0) d = Math.min(d, grid[(y - 1) * sw + x] + 1);
                if (x > 0 && y > 0) d = Math.min(d, grid[(y - 1) * sw + (x - 1)] + 1.414);
                if (x < sw - 1 && y > 0) d = Math.min(d, grid[(y - 1) * sw + (x + 1)] + 1.414);

                grid[idx] = d;
            }
        }

        let maxDist = 0;
        for (let y = sh - 1; y >= 0; y--) {
            for (let x = sw - 1; x >= 0; x--) {
                const idx = y * sw + x;
                let d = grid[idx];

                if (x < sw - 1) d = Math.min(d, grid[idx + 1] + 1);
                if (y < sh - 1) d = Math.min(d, grid[(y + 1) * sw + x] + 1);
                if (x < sw - 1 && y < sh - 1) d = Math.min(d, grid[(y + 1) * sw + (x + 1)] + 1.414);
                if (x > 0 && y < sh - 1) d = Math.min(d, grid[(y + 1) * sw + (x - 1)] + 1.414);

                grid[idx] = d;
                if (d > maxDist && d < 1e5) maxDist = d;
            }
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = sw;
        outCanvas.height = sh;
        const outCtx = outCanvas.getContext('2d');
        const outData = outCtx.createImageData(sw, sh);
        const oPix = outData.data;

        const maxVal = maxDist > 0 ? maxDist : 1;

        for (let i = 0; i < grid.length; i++) {
            let norm = grid[i] / maxVal;
            if (norm > 1.0) norm = 1.0;

            norm = Math.sin(norm * Math.PI * 0.5);
            norm = Math.pow(norm, 1.4);

            const v = Math.round(norm * 255);
            const pIdx = i * 4;
            oPix[pIdx] = v;
            oPix[pIdx + 1] = v;
            oPix[pIdx + 2] = v;
            oPix[pIdx + 3] = 255;
        }

        outCtx.putImageData(outData, 0, 0);
        return outCanvas;
    }

    // --- 画像の読み込み・処理 ---
    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                handleFileSelect(blob);
                break;
            }
        }
    });

    pasteImgBtn.addEventListener('click', async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    handleFileSelect(blob);
                    return;
                }
            }
            showToast('クリップボードに画像が見つかりませんでした。');
        } catch (err) {
            showToast('Ctrl+V / Cmd+V で画像を貼り付けてください。');
        }
    });

    resetImgBtn.addEventListener('click', () => {
        loadDemoImage();
        clearSalmonErase();
        showToast('画像をリセットしました');
    });

    async function handleFileSelect(file) {
        if (!file) return;

        const isHeic = file.name && (file.name.toLowerCase().endsWith('.heic') ||
            file.name.toLowerCase().endsWith('.heif')) ||
            file.type === 'image/heic' ||
            file.type === 'image/heif';

        if (!isHeic && file.type && !file.type.startsWith('image/')) {
            showToast('画像ファイルを選択してください');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = async () => {
            const processedImg = await resizeImageIfNeeded(img);
            setBgImage(processedImg, true);
            showToast('背景画像を読み込みました');
        };

        img.onerror = async () => {
            URL.revokeObjectURL(objectUrl);

            if (isHeic) {
                showToast('HEIC/HEIF画像を変換中...', 4000);
                try {
                    const converter = (typeof HeicTo !== 'undefined') ? HeicTo :
                        (typeof heicTo !== 'undefined') ? heicTo :
                            (window.HeicTo || window.heicTo || null);
                    if (!converter) {
                        showToast('HEIC/HEIF画像の変換に対応していません。JPEG/PNG画像をご利用ください');
                        return;
                    }

                    const convertedBlob = await converter({
                        blob: file,
                        type: 'image/jpeg',
                        quality: 0.90
                    });

                    const targetBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                    readBlobAndRender(targetBlob);
                } catch (err) {
                    console.error('HEIC/HEIF conversion error:', err);
                    showToast('HEIC/HEIF画像の変換に失敗しました。JPEG/PNG形式をお試しください', 4000);
                }
            } else {
                showToast('画像の読み込みに失敗しました');
            }
        };

        img.src = objectUrl;
    }

    function readBlobAndRender(blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                const processedImg = await resizeImageIfNeeded(img);
                setBgImage(processedImg, true);
                showToast('背景画像を読み込みました');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(blob);
    }

    function loadDemoImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);

        setBgImage(canvas, false);
    }

    function getBaseSalmonScale(canvasWidth) {
        const targetWidth = canvasWidth * 0.90 * 1.45;
        return targetWidth / (512 * salmonAspect);
    }

    function setBgImage(img, shouldScroll = true) {
        bgImage = img;
        currentAspectKey = 'original';

        mainCanvas.width = img.width;
        mainCanvas.height = img.height;
        overlayCanvas.width = img.width;
        overlayCanvas.height = img.height;

        salmonEraseCanvas.width = img.width;
        salmonEraseCanvas.height = img.height;
        salmonEraseCtx.clearRect(0, 0, img.width, img.height);

        salmonState.x = img.width / 2;
        salmonState.y = img.height / 2;
        salmonState.scale = getBaseSalmonScale(img.width);

        logoState.x = img.width / 2;
        logoState.y = img.height * 0.5;

        subtitleState.x = img.width / 2;
        subtitleState.y = img.height * 0.88;

        if (aspectDropdownMenu) {
            const items = aspectDropdownMenu.querySelectorAll('.dropdown-item');
            items.forEach(item => {
                const isOrig = item.getAttribute('data-aspect') === 'original';
                item.classList.toggle('active', isOrig);
                if (isOrig) {
                    const itemSvg = item.querySelector('svg');
                    const itemSpan = item.querySelector('span');
                    if (itemSvg && aspectSelectedIcon) aspectSelectedIcon.innerHTML = itemSvg.outerHTML;
                    if (itemSpan && aspectSelectedText) aspectSelectedText.textContent = itemSpan.textContent;
                }
            });
        }

        updateSalmonSliderUI();
        updateBrushCursorSize();
        requestRender();

        if (shouldScroll) {
            scrollToEditor();
        }
    }

    // --- アスペクト比変更ハンドラー ---
    function applyAspectRatio(aspectKey) {
        if (!bgImage) return;
        currentAspectKey = aspectKey;
        bgOffsetX = 0;
        bgOffsetY = 0;

        let targetW = bgImage.width;
        let targetH = bgImage.height;

        if (aspectKey !== 'original') {
            const parts = aspectKey.split(':').map(Number);
            const targetRatio = parts[0] / parts[1];
            const imgRatio = bgImage.width / bgImage.height;

            if (targetRatio >= imgRatio) {
                targetW = bgImage.width;
                targetH = Math.round(bgImage.width / targetRatio);
            } else {
                targetH = bgImage.height;
                targetW = Math.round(bgImage.height * targetRatio);
            }
        }

        const oldW = mainCanvas.width;
        const oldH = mainCanvas.height;

        mainCanvas.width = targetW;
        mainCanvas.height = targetH;
        overlayCanvas.width = targetW;
        overlayCanvas.height = targetH;

        salmonState.x = targetW / 2;
        salmonState.y = targetH / 2;
        logoState.x = targetW / 2;
        logoState.y = targetH * 0.5;
        subtitleState.x = targetW / 2;
        subtitleState.y = targetH * 0.88;

        const oldEraseCanvas = document.createElement('canvas');
        oldEraseCanvas.width = salmonEraseCanvas.width;
        oldEraseCanvas.height = salmonEraseCanvas.height;
        const oldCtx = oldEraseCanvas.getContext('2d');
        oldCtx.drawImage(salmonEraseCanvas, 0, 0);

        salmonEraseCanvas.width = targetW;
        salmonEraseCanvas.height = targetH;
        salmonEraseCtx.clearRect(0, 0, targetW, targetH);
        const offX = (targetW - oldW) / 2;
        const offY = (targetH - oldH) / 2;
        salmonEraseCtx.drawImage(oldEraseCanvas, offX, offY);

        updateBrushCursorSize();
        requestRender();
    }

    // カスタムドロップダウンのイベントリスナー
    if (aspectDropdownTrigger && aspectDropdown) {
        aspectDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = aspectDropdown.classList.contains('open');
            if (isOpen) {
                aspectDropdown.classList.remove('open');
                aspectDropdownTrigger.setAttribute('aria-expanded', 'false');
            } else {
                aspectDropdown.classList.add('open');
                aspectDropdownTrigger.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', (e) => {
            if (aspectDropdown && !aspectDropdown.contains(e.target)) {
                aspectDropdown.classList.remove('open');
                aspectDropdownTrigger.setAttribute('aria-expanded', 'false');
            }
        });

        if (aspectDropdownMenu) {
            const items = aspectDropdownMenu.querySelectorAll('.dropdown-item');
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    items.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');

                    const chosenAspect = item.getAttribute('data-aspect');
                    applyAspectRatio(chosenAspect);

                    const itemSvg = item.querySelector('svg');
                    const itemSpan = item.querySelector('span');
                    if (itemSvg && aspectSelectedIcon) {
                        aspectSelectedIcon.innerHTML = itemSvg.outerHTML;
                    }
                    if (itemSpan && aspectSelectedText) {
                        aspectSelectedText.textContent = itemSpan.textContent;
                    }

                    aspectDropdown.classList.remove('open');
                    aspectDropdownTrigger.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }

    // 光源の色カスタムドロップダウン
    if (lightColorDropdownTrigger && lightColorDropdown) {
        lightColorDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (aspectDropdown) aspectDropdown.classList.remove('open');
            const isOpen = lightColorDropdown.classList.contains('open');
            if (isOpen) {
                lightColorDropdown.classList.remove('open');
                lightColorDropdownTrigger.setAttribute('aria-expanded', 'false');
            } else {
                lightColorDropdown.classList.add('open');
                lightColorDropdownTrigger.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', (e) => {
            if (lightColorDropdown && !lightColorDropdown.contains(e.target)) {
                lightColorDropdown.classList.remove('open');
                lightColorDropdownTrigger.setAttribute('aria-expanded', 'false');
            }
        });

        if (lightColorDropdownMenu) {
            const items = lightColorDropdownMenu.querySelectorAll('.dropdown-item');
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    items.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');

                    const lightColor = item.getAttribute('data-light-color');
                    const displayColor = item.getAttribute('data-display-color');
                    const name = item.getAttribute('data-name');

                    if (lightColor === 'custom') {
                        lightColorDropdown.classList.remove('open');
                        lightColorDropdownTrigger.setAttribute('aria-expanded', 'false');
                        if (customLightColorInput) {
                            customLightColorInput.click();
                        }
                        return;
                    }

                    const borderStyle = (displayColor.toLowerCase() === '#ffffff' || displayColor.toLowerCase() === '#ffff00') ? 'border: 1px solid #ccc;' : '';
                    if (lightColorSelectedIcon) {
                        lightColorSelectedIcon.innerHTML = `<span class="color-swatch-badge" style="background-color: ${displayColor}; ${borderStyle}"></span>`;
                    }
                    if (lightColorSelectedText) {
                        lightColorSelectedText.textContent = name;
                    }

                    lightColorDropdown.classList.remove('open');
                    lightColorDropdownTrigger.setAttribute('aria-expanded', 'false');

                    updateLightColor(lightColor);
                });
            });
        }
    }

    if (customLightColorInput) {
        customLightColorInput.addEventListener('input', (e) => {
            const hexColor = e.target.value;
            if (lightColorSelectedIcon) {
                lightColorSelectedIcon.innerHTML = `<span class="color-swatch-badge" style="background-color: ${hexColor}; border: 1px solid #ccc;"></span>`;
            }
            if (lightColorSelectedText) {
                lightColorSelectedText.textContent = `カスタム (${hexColor.toUpperCase()})`;
            }
            updateLightColor(hexColor);
        });
    }

    function updateActiveModeUI(mode) {
        if (canvasWorkspace) {
            canvasWorkspace.style.touchAction = (mode === 'eraseSalmon') ? 'none' : 'pan-y';
        }

        if (dragHintOverlay) {
            dragHintOverlay.style.display = (mode === 'crop' || mode === 'logo' || mode === 'subtitle') ? 'inline-flex' : 'none';
        }

        salmonDragToggleRow.style.display = (mode === 'salmon') ? 'flex' : 'none';
        if (cropToggleRow) cropToggleRow.style.display = (mode === 'crop') ? 'flex' : 'none';
        maskToolToggleRow.style.display = (mode === 'eraseSalmon') ? 'flex' : 'none';
        if (maskUndoToggleRow) maskUndoToggleRow.style.display = (mode === 'eraseSalmon') ? 'flex' : 'none';
        if (logoEnableToggleRow) logoEnableToggleRow.style.display = (mode === 'logo') ? 'flex' : 'none';
        if (subtitleEnableToggleRow) subtitleEnableToggleRow.style.display = (mode === 'subtitle') ? 'flex' : 'none';

        eraserToolsCard.style.display = (mode === 'eraseSalmon') ? 'block' : 'none';
        logoToolsCard.style.display = (mode === 'logo') ? 'block' : 'none';
        if (subtitleToolsCard) subtitleToolsCard.style.display = (mode === 'subtitle') ? 'block' : 'none';
        if (fishToolsCard) fishToolsCard.style.display = (mode === 'salmon') ? 'block' : 'none';
    }

    // --- モード切替 ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            updateActiveModeUI(currentMode);
            requestRender();
        });
    });

    dragModeRadioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            salmonDragMode = e.target.value;
            renderAll();
        });
    });

    logoDragModeRadioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            logoDragMode = e.target.value;
            renderAll();
        });
    });

    maskToolRadioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentTool = e.target.value;
        });
    });

    fishTypeRadioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            activateFishType(e.target.value);
            showToast(`${FISH_CONFIGS[e.target.value].name} に切り替えました`);
        });
    });

    brushSizeInput.addEventListener('input', (e) => {
        brushSizePct = parseFloat(e.target.value) || 5.0;
        brushSizeVal.textContent = `${brushSizePct.toFixed(1)}%`;
        updateBrushCursorSize();

        if (currentMode === 'eraseSalmon') {
            const workspaceRect = canvasWorkspace.getBoundingClientRect();
            brushCursor.style.left = `${workspaceRect.width / 2}px`;
            brushCursor.style.top = `${workspaceRect.height / 2}px`;
            brushCursor.style.display = 'block';

            clearTimeout(brushPreviewTimeout);
            brushPreviewTimeout = setTimeout(() => {
                brushCursor.style.display = 'none';
            }, 1200);
        }
    });

    const brushShapeSelector = document.getElementById('brushShapeSelector');
    if (brushShapeSelector) {
        brushShapeSelector.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                brushShapeSelector.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                brushShape = btn.getAttribute('data-shape') || 'circle';
                updateBrushCursorSize();

                if (currentMode === 'eraseSalmon') {
                    const workspaceRect = canvasWorkspace.getBoundingClientRect();
                    brushCursor.style.left = `${workspaceRect.width / 2}px`;
                    brushCursor.style.top = `${workspaceRect.height / 2}px`;
                    brushCursor.style.display = 'block';

                    clearTimeout(brushPreviewTimeout);
                    brushPreviewTimeout = setTimeout(() => {
                        brushCursor.style.display = 'none';
                    }, 1200);
                }
            });
        });
    }

    undoEraseBtn.addEventListener('click', () => undoSalmonErase());
    clearEraseBtn.addEventListener('click', () => clearSalmonErase());

    // --- ロゴ設定コントロール ---
    if (logoShowInput) {
        logoShowInput.addEventListener('change', (e) => {
            logoState.visible = e.target.checked;
            requestRender();
        });
    }

    if (logoLine1Input) {
        logoLine1Input.addEventListener('input', (e) => {
            const cleanVal = e.target.value.replace(/[^a-zA-Z\s]/g, '');
            if (cleanVal !== e.target.value) {
                e.target.value = cleanVal;
            }
            logoState.line1 = e.target.value;
            clampLogoPosition();
            validateAllInputs();
        });
    }

    if (logoLine2Input) {
        logoLine2Input.addEventListener('input', (e) => {
            const cleanVal = e.target.value.replace(/[^a-zA-Z\s]/g, '');
            if (cleanVal !== e.target.value) {
                e.target.value = cleanVal;
            }
            logoState.line2 = e.target.value;
            clampLogoPosition();
            validateAllInputs();
        });
    }

    if (logoScaleInput) {
        logoScaleInput.addEventListener('input', (e) => {
            const pct = parseInt(e.target.value, 10) || 100;
            if (logoScaleVal) logoScaleVal.textContent = `${pct}%`;
            logoState.scale = pct / 100;
            clampLogoPosition();
            requestRender();
        });
    }

    if (resetLogoBtn) {
        resetLogoBtn.addEventListener('click', () => {
            resetLogoState();
            requestRender();
            showToast('ロゴ位置・サイズをリセットしました');
        });
    }

    function resetLogoState() {
        if (bgImage) {
            logoState.x = mainCanvas.width / 2;
            logoState.y = mainCanvas.height / 2;
        }
        logoState.scale = 1.0;
        logoState.rotZ = -10;
        logoState.handleRotZ = 10;

        if (logoScaleInput) {
            logoScaleInput.value = 100;
            if (logoScaleVal) logoScaleVal.textContent = '100%';
        }
        clampLogoPosition();
        validateAllInputs();
    }

    // --- 字幕コントロール ---
    if (subtitleShowInput) {
        subtitleShowInput.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            subtitleState.visible = isChecked;

            if (isChecked) {
                if (mainCanvas.width > 0 && (subtitleState.x === 0 || subtitleState.y === 0)) {
                    subtitleState.x = mainCanvas.width / 2;
                    subtitleState.y = mainCanvas.height * 0.88;
                }
            }
            clampSubtitlePosition();
            validateAllInputs();
        });
    }

    if (subtitleLine1Input) {
        subtitleLine1Input.addEventListener('input', (e) => {
            subtitleState.line1 = e.target.value;
            clampSubtitlePosition();
            validateAllInputs();
        });
    }

    if (subtitleLine2Input) {
        subtitleLine2Input.addEventListener('input', (e) => {
            subtitleState.line2 = e.target.value;
            clampSubtitlePosition();
            validateAllInputs();
        });
    }

    if (subtitleScaleInput) {
        subtitleScaleInput.addEventListener('input', (e) => {
            const pct = parseInt(e.target.value, 10) || 100;
            if (subtitleScaleVal) subtitleScaleVal.textContent = `${pct}%`;
            subtitleState.scale = pct / 100;
            clampSubtitlePosition();
            requestRender();
        });
    }

    if (resetSubtitleBtn) {
        resetSubtitleBtn.addEventListener('click', () => {
            resetSubtitleState();
            requestRender();
            showToast('字幕位置・サイズをリセットしました');
        });
    }

    function resetSubtitleState() {
        if (bgImage) {
            subtitleState.x = mainCanvas.width / 2;
            subtitleState.y = mainCanvas.height * 0.88;
        }
        subtitleState.scale = 1.0;

        if (subtitleScaleInput) {
            subtitleScaleInput.value = 100;
            if (subtitleScaleVal) subtitleScaleVal.textContent = '100%';
        }
        clampSubtitlePosition();
        validateAllInputs();
    }

    // --- おさかな設定コントロール ---
    if (salmonScaleInput) {
        salmonScaleInput.addEventListener('input', (e) => {
            const pct = parseInt(e.target.value, 10);
            if (salmonScaleVal) salmonScaleVal.textContent = `${pct}%`;
            if (bgImage) {
                const baseScale = getBaseSalmonScale(bgImage.width);
                salmonState.scale = (pct / 100) * baseScale;
                renderAll();
            }
        });
    }

    if (salmonRotZInput) {
        salmonRotZInput.addEventListener('input', (e) => {
            const deg = parseInt(e.target.value, 10);
            if (salmonRotZVal) salmonRotZVal.textContent = `${deg}°`;
            salmonState.rotZ = deg;
            renderAll();
        });
    }

    salmonBulgeInput.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10);
        salmonBulgeVal.textContent = `${pct}%`;
        salmonState.bulge = pct / 100;

        Object.keys(fishCache).forEach(type => {
            const grp = fishCache[type].group;
            if (grp && grp.children) {
                grp.children.forEach(mesh => {
                    if (mesh.material && mesh.material.displacementScale !== undefined) {
                        mesh.material.displacementScale = salmonState.bulge;
                    }
                });
            }
        });

        renderAll();
    });

    function updateLightColor(colorHex) {
        if (dirLight) {
            dirLight.color.set(colorHex);
            renderAll();
        }
    }

    resetSalmonBtn.addEventListener('click', () => {
        resetSalmonState();
        requestRender();
        showToast('位置・角度・色をリセットしました');
    });

    function resetSalmonState() {
        if (bgImage) {
            salmonState.x = mainCanvas.width / 2;
            salmonState.y = mainCanvas.height / 2;
            salmonState.scale = getBaseSalmonScale(bgImage.width);
        }
        salmonState.bulge = 0.35;
        salmonState.rotX = 0;
        salmonState.rotY = 0;
        salmonState.rotZ = 0;
        salmonState.handleRotZ = 0;

        if (lightColorDropdownMenu) {
            const items = lightColorDropdownMenu.querySelectorAll('.dropdown-item');
            items.forEach(i => {
                const isWhite = i.getAttribute('data-light-color') === '#ffffff';
                i.classList.toggle('active', isWhite);
            });
        }
        if (lightColorSelectedIcon) {
            lightColorSelectedIcon.innerHTML = `<span class="color-swatch-badge" style="background-color: #ffffff; border: 1px solid #ccc;"></span>`;
        }
        if (lightColorSelectedText) {
            lightColorSelectedText.textContent = 'ホワイト (標準)';
        }
        updateLightColor('#ffffff');

        Object.keys(fishCache).forEach(type => {
            const grp = fishCache[type].group;
            if (grp && grp.children) {
                grp.children.forEach(mesh => {
                    if (mesh.material && mesh.material.displacementScale !== undefined) {
                        mesh.material.displacementScale = 0.35;
                    }
                });
            }
        });

        updateSalmonSliderUI();
    }

    function updateSalmonSliderUI() {
        salmonScaleInput.value = 100;
        salmonScaleVal.textContent = '100%';
        if (salmonRotZInput) salmonRotZInput.value = 0;
        if (salmonRotZVal) salmonRotZVal.textContent = '0°';
        salmonBulgeInput.value = Math.round(salmonState.bulge * 100);
        if (lightColorDropdownMenu) {
            const items = lightColorDropdownMenu.querySelectorAll('.dropdown-item');
            items.forEach(i => {
                const isWhite = i.getAttribute('data-light-color') === '#ffffff';
                i.classList.toggle('active', isWhite);
            });
        }
        if (lightColorSelectedIcon) {
            lightColorSelectedIcon.innerHTML = `<span class="color-swatch-badge" style="background-color: #ffffff; border: 1px solid #ccc;"></span>`;
        }
        if (lightColorSelectedText) {
            lightColorSelectedText.textContent = 'ホワイト (標準)';
        }
    }

    // --- キャンバスドラッグ操作 ---
    canvasWorkspace.addEventListener('mouseenter', () => {
        if (currentMode === 'eraseSalmon') brushCursor.style.display = 'block';
    });

    canvasWorkspace.addEventListener('mouseleave', () => {
        brushCursor.style.display = 'none';
        isDrawing = false;
    });

    canvasWorkspace.addEventListener('mousemove', (e) => {
        updateBrushCursorPos(e);
        updateCanvasCursor(e);
        if (isDrawing && bgImage) {
            const pos = getCanvasPos(e);
            handleDrawStroke(pos, e);
        }
    });

    canvasWorkspace.addEventListener('mousedown', (e) => {
        if (!bgImage) return;
        isDrawing = true;
        const pos = getCanvasPos(e);
        lastDrawPos = pos;
        lastScreenPos = { x: e.clientX, y: e.clientY };

        if (currentMode === 'salmon') {
            if (salmonDragMode === 'move') {
                const hPos = getSalmonHandlePos();
                if (isNearHandle(pos, hPos)) {
                    activeDragAction = 'resize';
                    isDragTargetHit = true;
                    initialResizeDist = Math.max(10, Math.hypot(pos.x - salmonState.x, pos.y - salmonState.y));
                    initialResizeScale = salmonState.scale;
                } else if (isInsideSalmonBounds(pos)) {
                    activeDragAction = 'move';
                    isDragTargetHit = true;
                } else {
                    activeDragAction = 'none';
                    isDragTargetHit = false;
                }
            } else {
                activeDragAction = 'rotate';
                isDragTargetHit = true;
            }
        } else if (currentMode === 'logo') {
            if (logoDragMode === 'move') {
                const hPos = getLogoHandlePos();
                if (isNearHandle(pos, hPos)) {
                    activeDragAction = 'resize';
                    isDragTargetHit = true;
                    initialResizeDist = Math.max(10, Math.hypot(pos.x - logoState.x, pos.y - logoState.y));
                    initialResizeScale = logoState.scale;
                } else if (isInsideLogoBounds(pos)) {
                    activeDragAction = 'move';
                    isDragTargetHit = true;
                } else {
                    activeDragAction = 'none';
                    isDragTargetHit = false;
                }
            } else {
                activeDragAction = 'rotate';
                isDragTargetHit = true;
            }
        } else if (currentMode === 'subtitle') {
            const hPos = getSubtitleHandlePos();
            if (isNearHandle(pos, hPos)) {
                activeDragAction = 'resize';
                isDragTargetHit = true;
                initialResizeDist = Math.max(10, Math.hypot(pos.x - subtitleState.x, pos.y - subtitleState.y));
                initialResizeScale = subtitleState.scale;
            } else if (isInsideSubtitleBounds(pos)) {
                activeDragAction = 'move';
                isDragTargetHit = true;
            } else {
                activeDragAction = 'none';
                isDragTargetHit = false;
            }
        } else if (currentMode === 'crop') {
            activeDragAction = 'move';
            isDragTargetHit = true;
        } else if (currentMode === 'eraseSalmon') {
            activeDragAction = 'erase';
            isDragTargetHit = true;
            saveSalmonEraseUndoState();
            handleDrawStroke(pos, e);
        }
        updateCanvasCursor(e);
        renderOverlay();
    });

    window.addEventListener('mouseup', () => {
        isDrawing = false;
        isDragTargetHit = false;
        activeDragAction = 'none';
        lastDrawPos = null;
        lastScreenPos = null;
        if (bgImage) renderOverlay();
    });

    canvasWorkspace.addEventListener('touchstart', (e) => {
        if (!bgImage || e.touches.length === 0) return;
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);

        let hit = false;

        if (currentMode === 'salmon') {
            if (salmonDragMode === 'move') {
                const hPos = getSalmonHandlePos();
                if (isNearHandle(pos, hPos)) {
                    activeDragAction = 'resize';
                    hit = true;
                    initialResizeDist = Math.max(10, Math.hypot(pos.x - salmonState.x, pos.y - salmonState.y));
                    initialResizeScale = salmonState.scale;
                } else if (isInsideSalmonBounds(pos)) {
                    activeDragAction = 'move';
                    hit = true;
                } else {
                    activeDragAction = 'none';
                    hit = false;
                }
            } else {
                const baseScale = getBaseSalmonScale(bgImage.width) || 1;
                const relativeScale = salmonState.scale / baseScale;
                const radius = Math.max(70, Math.min(mainCanvas.width * 0.4, 130 * relativeScale));
                const uiScale = getUIScale();
                const touchRadius = radius + 32 * uiScale;
                const distFromCenter = Math.hypot(pos.x - salmonState.x, pos.y - salmonState.y);
                if (distFromCenter <= touchRadius) {
                    activeDragAction = 'rotate';
                    hit = true;
                } else {
                    activeDragAction = 'none';
                    hit = false;
                }
            }
        } else if (currentMode === 'logo') {
            if (logoDragMode === 'move') {
                const hPos = getLogoHandlePos();
                if (isNearHandle(pos, hPos)) {
                    activeDragAction = 'resize';
                    hit = true;
                    initialResizeDist = Math.max(10, Math.hypot(pos.x - logoState.x, pos.y - logoState.y));
                    initialResizeScale = logoState.scale;
                } else if (isInsideLogoBounds(pos)) {
                    activeDragAction = 'move';
                    hit = true;
                } else {
                    activeDragAction = 'none';
                    hit = false;
                }
            } else {
                const radius = Math.max(70, Math.min(mainCanvas.width * 0.4, 130 * logoState.scale));
                const uiScale = getUIScale();
                const touchRadius = radius + 32 * uiScale;
                const distFromCenter = Math.hypot(pos.x - logoState.x, pos.y - logoState.y);
                if (distFromCenter <= touchRadius) {
                    activeDragAction = 'rotate';
                    hit = true;
                } else {
                    activeDragAction = 'none';
                    hit = false;
                }
            }
        } else if (currentMode === 'subtitle') {
            const hPos = getSubtitleHandlePos();
            if (isNearHandle(pos, hPos)) {
                activeDragAction = 'resize';
                hit = true;
                initialResizeDist = Math.max(10, Math.hypot(pos.x - subtitleState.x, pos.y - subtitleState.y));
                initialResizeScale = subtitleState.scale;
            } else if (isInsideSubtitleBounds(pos)) {
                activeDragAction = 'move';
                hit = true;
            } else {
                activeDragAction = 'none';
                hit = false;
            }
        } else if (currentMode === 'crop') {
            activeDragAction = 'move';
            hit = true;
        } else if (currentMode === 'eraseSalmon') {
            activeDragAction = 'erase';
            hit = true;
            saveSalmonEraseUndoState();
            handleDrawStroke(pos, touch);
        }

        isDragTargetHit = hit;
        isDrawing = hit;
        lastDrawPos = pos;
        lastScreenPos = { x: touch.clientX, y: touch.clientY };

        if (hit && e.cancelable) {
            e.preventDefault();
        }
        renderOverlay();
    }, { passive: false });

    canvasWorkspace.addEventListener('touchmove', (e) => {
        if (!isDrawing || !isDragTargetHit || !bgImage || e.touches.length === 0) return;
        if (e.cancelable) {
            e.preventDefault();
        }
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);
        handleDrawStroke(pos, touch);
    }, { passive: false });

    canvasWorkspace.addEventListener('touchend', () => {
        isDrawing = false;
        isDragTargetHit = false;
        activeDragAction = 'none';
        lastDrawPos = null;
        lastScreenPos = null;
        if (bgImage) renderOverlay();
    });

    canvasWorkspace.addEventListener('touchcancel', () => {
        isDrawing = false;
        isDragTargetHit = false;
        activeDragAction = 'none';
        lastDrawPos = null;
        lastScreenPos = null;
        if (bgImage) renderOverlay();
    });

    function getCanvasPos(e) {
        const rect = mainCanvas.getBoundingClientRect();
        const scaleX = mainCanvas.width / rect.width;
        const scaleY = mainCanvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function updateBrushCursorPos(e) {
        if (currentMode !== 'eraseSalmon') {
            brushCursor.style.display = 'none';
            return;
        }
        brushCursor.style.display = 'block';
        const rect = canvasWorkspace.getBoundingClientRect();
        brushCursor.style.left = `${e.clientX - rect.left}px`;
        brushCursor.style.top = `${e.clientY - rect.top}px`;
        updateBrushCursorSize();
    }

    function updateBrushCursorSize() {
        const rect = mainCanvas.getBoundingClientRect();
        if (!rect.width || !mainCanvas.width) return;
        const actualBrushSize = getActualBrushPixelSize();
        const displayScale = rect.width / mainCanvas.width;
        const displaySize = Math.max(6, actualBrushSize * displayScale);
        brushCursor.style.width = `${displaySize}px`;
        brushCursor.style.height = `${displaySize}px`;

        let svgContent = '';
        if (brushShape === 'square') {
            svgContent = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;overflow:visible;">
                <rect x="3" y="3" width="94" height="94" rx="3" stroke="#2e7d32" stroke-width="4" fill="rgba(46, 125, 50, 0.25)" />
            </svg>`;
        } else if (brushShape === 'triangle') {
            svgContent = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;overflow:visible;">
                <polygon points="50,3 97,97 3,97" stroke="#2e7d32" stroke-width="4" stroke-linejoin="round" fill="rgba(46, 125, 50, 0.25)" />
            </svg>`;
        } else if (brushShape === 'triangle-down') {
            svgContent = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;overflow:visible;">
                <polygon points="50,97 3,3 97,3" stroke="#2e7d32" stroke-width="4" stroke-linejoin="round" fill="rgba(46, 125, 50, 0.25)" />
            </svg>`;
        } else {
            svgContent = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;overflow:visible;">
                <circle cx="50" cy="50" r="47" stroke="#2e7d32" stroke-width="4" fill="rgba(46, 125, 50, 0.25)" />
            </svg>`;
        }
        brushCursor.innerHTML = svgContent;
    }

    function drawBrushShape(ctx, x, y, size, shape) {
        const half = size / 2;
        ctx.beginPath();
        if (shape === 'square') {
            ctx.rect(x - half, y - half, size, size);
        } else if (shape === 'triangle') {
            ctx.moveTo(x, y - half);
            ctx.lineTo(x + half, y + half);
            ctx.lineTo(x - half, y + half);
            ctx.closePath();
        } else if (shape === 'triangle-down') {
            ctx.moveTo(x, y + half);
            ctx.lineTo(x - half, y - half);
            ctx.lineTo(x + half, y - half);
            ctx.closePath();
        } else {
            ctx.arc(x, y, half, 0, Math.PI * 2);
        }
    }

    // --- マスク描画（削り・復元） ---
    function handleDrawStroke(pos, e) {
        if (currentMode === 'salmon') {
            if (lastDrawPos && lastScreenPos && e) {
                if (salmonDragMode === 'move' && !isDragTargetHit) {
                    lastDrawPos = pos;
                    lastScreenPos = { x: e.clientX, y: e.clientY };
                    return;
                }

                const dx = pos.x - lastDrawPos.x;
                const dy = pos.y - lastDrawPos.y;

                const screenDx = e.clientX - lastScreenPos.x;
                const screenDy = e.clientY - lastScreenPos.y;

                if (salmonDragMode === 'move') {
                    if (activeDragAction === 'resize') {
                        const currentDist = Math.hypot(pos.x - salmonState.x, pos.y - salmonState.y);
                        if (initialResizeDist > 5) {
                            const ratio = currentDist / initialResizeDist;
                            const baseScale = getBaseSalmonScale(bgImage.width) || 1;
                            let targetPct = Math.round(((initialResizeScale * ratio) / baseScale) * 100);
                            targetPct = Math.max(20, Math.min(300, targetPct));
                            salmonState.scale = (targetPct / 100) * baseScale;
                            if (salmonScaleInput) salmonScaleInput.value = targetPct;
                            if (salmonScaleVal) salmonScaleVal.textContent = `${targetPct}%`;
                        }
                    } else {
                        salmonState.x += dx;
                        salmonState.y += dy;
                    }
                } else if (salmonDragMode === 'rotate') {
                    const radZ = (salmonState.rotZ * Math.PI) / 180;
                    const cosZ = Math.cos(radZ);
                    const sinZ = Math.sin(radZ);
                    const localDx = screenDx * cosZ + screenDy * sinZ;
                    const localDy = -screenDx * sinZ + screenDy * cosZ;
                    salmonState.rotY += localDx * 0.6;
                    salmonState.rotX = Math.max(-85, Math.min(85, salmonState.rotX + localDy * 0.4));
                } else if (salmonDragMode === 'rotate2d') {
                    const cx = salmonState.x;
                    const cy = salmonState.y;
                    const distPrev = Math.hypot(lastDrawPos.x - cx, lastDrawPos.y - cy);
                    const distCurr = Math.hypot(pos.x - cx, pos.y - cy);
                    if (distPrev > 5 && distCurr > 5) {
                        const prevAngleRad = Math.atan2(lastDrawPos.y - cy, lastDrawPos.x - cx);
                        const currAngleRad = Math.atan2(pos.y - cy, pos.x - cx);
                        let deltaDeg = (currAngleRad - prevAngleRad) * (180 / Math.PI);
                        if (deltaDeg > 180) deltaDeg -= 360;
                        if (deltaDeg < -180) deltaDeg += 360;
                        if (salmonState.handleRotZ === undefined) salmonState.handleRotZ = salmonState.rotZ;
                        salmonState.handleRotZ += deltaDeg;
                        salmonState.rotZ += deltaDeg;
                    } else {
                        if (salmonState.handleRotZ === undefined) salmonState.handleRotZ = salmonState.rotZ;
                        salmonState.handleRotZ += screenDx * 0.6;
                        salmonState.rotZ += screenDx * 0.6;
                    }
                }

                renderAll();
            }
            lastDrawPos = pos;
            if (e) {
                lastScreenPos = { x: e.clientX, y: e.clientY };
            }
            return;
        } else if (currentMode === 'logo') {
            if (lastDrawPos && lastScreenPos && e) {
                if (logoDragMode === 'move' && !isDragTargetHit) {
                    lastDrawPos = pos;
                    lastScreenPos = { x: e.clientX, y: e.clientY };
                    return;
                }

                const dx = pos.x - lastDrawPos.x;
                const dy = pos.y - lastDrawPos.y;
                const screenDx = e.clientX - lastScreenPos.x;

                if (logoDragMode === 'move') {
                    if (activeDragAction === 'resize') {
                        const currentDist = Math.hypot(pos.x - logoState.x, pos.y - logoState.y);
                        if (initialResizeDist > 5) {
                            const ratio = currentDist / initialResizeDist;
                            let targetScale = initialResizeScale * ratio;
                            targetScale = Math.max(0.3, Math.min(2.5, targetScale));
                            logoState.scale = targetScale;
                            clampLogoPosition();
                            const pct = Math.round(targetScale * 100);
                            if (logoScaleInput) logoScaleInput.value = pct;
                            if (logoScaleVal) logoScaleVal.textContent = `${pct}%`;
                        }
                    } else {
                        logoState.x += dx;
                        logoState.y += dy;
                        clampLogoPosition();
                    }
                } else if (logoDragMode === 'rotate') {
                    const cx = logoState.x;
                    const cy = logoState.y;
                    const distPrev = Math.hypot(lastDrawPos.x - cx, lastDrawPos.y - cy);
                    const distCurr = Math.hypot(pos.x - cx, pos.y - cy);
                    if (distPrev > 5 && distCurr > 5) {
                        const prevAngleRad = Math.atan2(lastDrawPos.y - cy, lastDrawPos.x - cx);
                        const currAngleRad = Math.atan2(pos.y - cy, pos.x - cx);
                        let deltaDeg = (currAngleRad - prevAngleRad) * (180 / Math.PI);
                        if (deltaDeg > 180) deltaDeg -= 360;
                        if (deltaDeg < -180) deltaDeg += 360;
                        if (logoState.handleRotZ === undefined) logoState.handleRotZ = logoState.rotZ;
                        logoState.handleRotZ += deltaDeg;
                        logoState.rotZ += deltaDeg;
                    } else {
                        if (logoState.handleRotZ === undefined) logoState.handleRotZ = logoState.rotZ;
                        logoState.handleRotZ += screenDx * 0.6;
                        logoState.rotZ += screenDx * 0.6;
                    }
                }

                renderAll();
            }
            lastDrawPos = pos;
            if (e) {
                lastScreenPos = { x: e.clientX, y: e.clientY };
            }
            return;
        } else if (currentMode === 'subtitle') {
            if (lastDrawPos && isDragTargetHit) {
                if (activeDragAction === 'resize') {
                    const currentDist = Math.hypot(pos.x - subtitleState.x, pos.y - subtitleState.y);
                    if (initialResizeDist > 5) {
                        const ratio = currentDist / initialResizeDist;
                        let targetScale = initialResizeScale * ratio;
                        targetScale = Math.max(0.4, Math.min(2.5, targetScale));
                        subtitleState.scale = targetScale;
                        clampSubtitlePosition();
                        const pct = Math.round(targetScale * 100);
                        if (subtitleScaleInput) subtitleScaleInput.value = pct;
                        if (subtitleScaleVal) subtitleScaleVal.textContent = `${pct}%`;
                    }
                } else {
                    const dx = pos.x - lastDrawPos.x;
                    const dy = pos.y - lastDrawPos.y;
                    subtitleState.x += dx;
                    subtitleState.y += dy;
                    clampSubtitlePosition();
                }
                renderAll();
            }
            lastDrawPos = pos;
            if (e) {
                lastScreenPos = { x: e.clientX, y: e.clientY };
            }
            return;
        } else if (currentMode === 'crop') {
            if (lastDrawPos) {
                const dx = pos.x - lastDrawPos.x;
                const dy = pos.y - lastDrawPos.y;
                bgOffsetX += dx;
                bgOffsetY += dy;

                if (bgImage) {
                    const minX = mainCanvas.width - bgImage.width - (mainCanvas.width - bgImage.width) / 2;
                    const maxX = -(mainCanvas.width - bgImage.width) / 2;
                    if (bgImage.width >= mainCanvas.width) {
                        bgOffsetX = Math.max(minX, Math.min(maxX, bgOffsetX));
                    }
                    const minY = mainCanvas.height - bgImage.height - (mainCanvas.height - bgImage.height) / 2;
                    const maxY = -(mainCanvas.height - bgImage.height) / 2;
                    if (bgImage.height >= mainCanvas.height) {
                        bgOffsetY = Math.max(minY, Math.min(maxY, bgOffsetY));
                    }
                }
                renderAll();
            }
            lastDrawPos = pos;
            if (e) {
                lastScreenPos = { x: e.clientX, y: e.clientY };
            }
            return;
        }

        const actualBrushSize = getActualBrushPixelSize();

        const dist = lastDrawPos ? Math.hypot(pos.x - lastDrawPos.x, pos.y - lastDrawPos.y) : 0;
        const step = Math.max(1, actualBrushSize * 0.12);
        const count = Math.max(1, Math.ceil(dist / step));

        if (currentTool === 'erase') {
            salmonEraseCtx.fillStyle = '#ffffff';
            for (let i = 1; i <= count; i++) {
                const t = i / count;
                const ix = lastDrawPos ? (lastDrawPos.x + (pos.x - lastDrawPos.x) * t) : pos.x;
                const iy = lastDrawPos ? (lastDrawPos.y + (pos.y - lastDrawPos.y) * t) : pos.y;
                drawBrushShape(salmonEraseCtx, ix, iy, actualBrushSize, brushShape);
                salmonEraseCtx.fill();
            }

            spawnBonitoFlakes(pos.x, pos.y, actualBrushSize);
        } else if (currentTool === 'restore') {
            salmonEraseCtx.save();
            salmonEraseCtx.globalCompositeOperation = 'destination-out';
            for (let i = 1; i <= count; i++) {
                const t = i / count;
                const ix = lastDrawPos ? (lastDrawPos.x + (pos.x - lastDrawPos.x) * t) : pos.x;
                const iy = lastDrawPos ? (lastDrawPos.y + (pos.y - lastDrawPos.y) * t) : pos.y;
                drawBrushShape(salmonEraseCtx, ix, iy, actualBrushSize, brushShape);
                salmonEraseCtx.fill();
            }
            salmonEraseCtx.restore();
        }

        lastDrawPos = pos;
        if (e) {
            lastScreenPos = { x: e.clientX, y: e.clientY };
        }
        renderAll();
    }

    function saveSalmonEraseUndoState() {
        if (!bgImage) return;
        const snapshot = salmonEraseCtx.getImageData(0, 0, salmonEraseCanvas.width, salmonEraseCanvas.height);
        eraseUndoStack.push(snapshot);
        if (eraseUndoStack.length > 15) eraseUndoStack.shift();
    }

    function undoSalmonErase() {
        if (eraseUndoStack.length === 0) return;
        const snapshot = eraseUndoStack.pop();
        salmonEraseCtx.putImageData(snapshot, 0, 0);
        renderAll();
        showToast('操作を取り消しました');
    }

    function clearSalmonErase() {
        if (!bgImage) return;
        saveSalmonEraseUndoState();
        salmonEraseCtx.clearRect(0, 0, salmonEraseCanvas.width, salmonEraseCanvas.height);
        renderAll();
        showToast('マスクを消去しました');
    }

    // --- Popロゴ描画ジェネレーター ---
    function drawPopLogo(ctx, x, y, scale, rotZ, text1, text2) {
        if (!text1 && !text2) return;
        if (isNgWordDetected) return;

        const l1 = (text1 || '').toUpperCase();
        const l2 = (text2 || '').toUpperCase();

        ctx.save();
        ctx.translate(x, y);

        const radZ = (rotZ * Math.PI) / 180;
        const skewRadX = (-5 * Math.PI) / 180;

        ctx.rotate(radZ);
        ctx.transform(1, 0, Math.tan(skewRadX), 1, 0, 0);

        const baseFontSize = 88;
        const lineGap = 72;
        const fontFamily = "'Permanent Marker', cursive, sans-serif";

        function measureLine(text, isLine1 = false) {
            if (!text) return { width: 0, items: [] };
            const items = [];
            let totalWidth = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const isFirst = (i === 0);
                const scaleFactor = isFirst ? (isLine1 ? 1.48 : 1.25) : 1.0;
                const fontSz = baseFontSize * scaleFactor;
                ctx.font = `900 ${fontSz}px ${fontFamily}`;
                const metrics = ctx.measureText(char);
                const w = metrics.width * 0.97;
                items.push({ char, isFirst, fontSz, width: w });
                totalWidth += w;
            }
            return { width: totalWidth, items };
        }

        const line1Data = measureLine(l1, true);
        const line2Data = measureLine(l2, false);

        const maxLineW = Math.max(line1Data.width, line2Data.width);
        const exFontSz = baseFontSize * 1.85;
        ctx.font = `900 ${exFontSz}px ${fontFamily}`;
        const exMarkW = ctx.measureText('!').width * 1.1;

        const totalW = maxLineW + exMarkW + 15;

        // ロゴ表示幅がキャンバス横幅の88%を超える場合のみ動的自動縮小
        const scaledTextWidth = totalW * scale;
        const maxAllowedWidth = ctx.canvas.width * 0.88;

        let autoFitScale = 1.0;
        if (scaledTextWidth > maxAllowedWidth) {
            autoFitScale = maxAllowedWidth / scaledTextWidth;
        }

        const finalScale = scale * autoFitScale;
        ctx.scale(finalScale, finalScale);

        const totalH = lineGap + baseFontSize * 1.3;

        const startX = -totalW / 2;
        const startY = -totalH / 2 + baseFontSize * 0.95;

        const startX1 = startX;
        const startX2 = startX + (maxLineW - line2Data.width);

        const centerX = startX + totalW / 2;
        const centerY = startY + lineGap / 2 - baseFontSize * 0.30;
        const gradHalfLen = (lineGap + baseFontSize * 1.8) / 2;
        const gradAngleRad = (5 * Math.PI) / 180;

        const gradDx = Math.sin(gradAngleRad) * gradHalfLen;
        const gradDy = Math.cos(gradAngleRad) * gradHalfLen;

        const gradient = ctx.createLinearGradient(
            centerX - gradDx,
            centerY - gradDy,
            centerX + gradDx,
            centerY + gradDy
        );
        gradient.addColorStop(0, '#00ff66');
        gradient.addColorStop(0.1, '#ffff00');
        gradient.addColorStop(0.2, '#ff3300');
        gradient.addColorStop(0.3, '#ff007f');
        gradient.addColorStop(0.4, '#9900ff');
        gradient.addColorStop(0.5, '#00d2ff');
        gradient.addColorStop(0.6, '#00ff66');
        gradient.addColorStop(0.7, '#ffff00');
        gradient.addColorStop(0.8, '#ff3300');
        gradient.addColorStop(0.9, '#ff007f');

        function drawLogoTextGeometry(offX, offY, fillStyle, strokeStyle, baseLineWidth) {
            let curX = startX1 + offX;
            const y1 = startY + offY;
            line1Data.items.forEach(item => {
                ctx.font = `900 ${item.fontSz}px ${fontFamily}`;
                if (strokeStyle && baseLineWidth > 0) {
                    ctx.lineWidth = baseLineWidth;
                    ctx.strokeStyle = strokeStyle;
                    ctx.strokeText(item.char, curX, y1);
                }
                if (fillStyle) {
                    ctx.fillStyle = fillStyle;
                    ctx.fillText(item.char, curX, y1);
                }
                curX += item.width;
            });

            curX = startX2 + offX;
            const y2 = startY + lineGap + offY;
            line2Data.items.forEach(item => {
                ctx.font = `900 ${item.fontSz}px ${fontFamily}`;
                const charY2 = item.isFirst ? y2 + (item.fontSz - baseFontSize) * 0.70 : y2;

                if (strokeStyle && baseLineWidth > 0) {
                    ctx.lineWidth = baseLineWidth;
                    ctx.strokeStyle = strokeStyle;
                    ctx.strokeText(item.char, curX, charY2);
                }
                if (fillStyle) {
                    ctx.fillStyle = fillStyle;
                    ctx.fillText(item.char, curX, charY2);
                }
                curX += item.width;
            });

            const exX = startX + maxLineW + 10 + offX;
            const exY = startY + lineGap * 0.85 + offY;
            ctx.font = `900 ${exFontSz}px ${fontFamily}`;
            if (strokeStyle && baseLineWidth > 0) {
                ctx.lineWidth = baseLineWidth;
                ctx.strokeStyle = strokeStyle;
                ctx.strokeText('!', exX, exY);
            }
            if (fillStyle) {
                ctx.fillStyle = fillStyle;
                ctx.fillText('!', exX, exY);
            }
        }

        function renderLogoPasses() {
            ctx.lineJoin = 'miter';
            ctx.lineCap = 'butt';
            ctx.miterLimit = 5.0;

            const borderLineWidth = 6.0;

            drawLogoTextGeometry(1.5, 1.5, null, 'rgba(0, 0, 0, 0.5)', borderLineWidth + 1.5);
            drawLogoTextGeometry(-1.5, -1.5, null, 'rgba(255, 255, 255, 0.85)', borderLineWidth + 1.0);
            drawLogoTextGeometry(0, 0, null, '#000000', borderLineWidth);
            drawLogoTextGeometry(0, 0, gradient, null, 0);
        }

        renderLogoPasses();
        ctx.restore();
    }

    // --- 字幕描画関数 ---
    function drawSubtitles(ctx, cx, cy, baseScale, line1, line2) {
        const text1 = (line1 || '').trim();
        const text2 = (line2 || '').trim();
        if (!text1 && !text2) return;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontFamily = '"Noto Serif JP", serif';
        const refDim = bgImage ? Math.max(bgImage.width, bgImage.height) : 800;
        const scaleRatio = (refDim / 800) * subtitleState.scale;

        let fontSize = Math.round(38 * scaleRatio);
        let strokeWidth = Math.max(2, 4.5 * scaleRatio);
        let lineGap = 12 * scaleRatio;

        // キャンバス幅を超過する場合の自動縮小計算
        const canvasWidth = bgImage ? mainCanvas.width : 800;
        const allowedWidth = canvasWidth * 0.94;

        ctx.font = `900 ${fontSize}px ${fontFamily}`;
        const w1 = text1 ? ctx.measureText(text1).width : 0;
        const w2 = text2 ? ctx.measureText(text2).width : 0;
        const maxTextWidth = Math.max(w1, w2);

        if (maxTextWidth > allowedWidth && maxTextWidth > 0) {
            const fitScale = allowedWidth / maxTextWidth;
            fontSize = Math.max(10, Math.floor(fontSize * fitScale));
            strokeWidth = Math.max(1.5, strokeWidth * fitScale);
            lineGap = lineGap * fitScale;
        }

        ctx.lineJoin = 'round';
        ctx.miterLimit = 3.0;

        let l1Y = cy;
        let l2Y = cy;

        if (text1 && text2) {
            l1Y = cy - (fontSize + lineGap) / 2;
            l2Y = cy + (fontSize + lineGap) / 2;
        } else {
            l1Y = cy;
            l2Y = cy;
        }

        if (text1) {
            ctx.font = `900 ${fontSize}px ${fontFamily}`;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
            ctx.lineWidth = strokeWidth;
            ctx.strokeText(text1, cx, l1Y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text1, cx, l1Y);
        }

        if (text2) {
            ctx.font = `900 ${fontSize}px ${fontFamily}`;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
            ctx.lineWidth = strokeWidth;
            ctx.strokeText(text2, cx, l2Y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text2, cx, l2Y);
        }

        ctx.restore();
    }

    // --- メインレンダリングパイプライン ---
    function renderAll(forExport = false) {
        if (!bgImage) return;

        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        const bgX = (mainCanvas.width - bgImage.width) / 2 + bgOffsetX;
        const bgY = (mainCanvas.height - bgImage.height) / 2 + bgOffsetY;
        mainCtx.drawImage(bgImage, bgX, bgY);

        renderThreeSalmon();

        if (isSalmonLoaded && threeCanvas && activeSalmonGroup) {
            const salmonWidth = threeCanvas.width;
            const salmonHeight = threeCanvas.height;

            if (tempSalmonCanvas.width !== mainCanvas.width || tempSalmonCanvas.height !== mainCanvas.height) {
                tempSalmonCanvas.width = mainCanvas.width;
                tempSalmonCanvas.height = mainCanvas.height;
            }
            tempSalmonCtx.globalCompositeOperation = 'source-over';
            tempSalmonCtx.clearRect(0, 0, tempSalmonCanvas.width, tempSalmonCanvas.height);

            tempSalmonCtx.save();
            tempSalmonCtx.translate(salmonState.x, salmonState.y);
            tempSalmonCtx.rotate((salmonState.rotZ * Math.PI) / 180);
            tempSalmonCtx.drawImage(threeCanvas, -salmonWidth / 2, -salmonHeight / 2);
            tempSalmonCtx.restore();

            if (salmonEraseCanvas.width > 0) {
                tempSalmonCtx.globalCompositeOperation = 'destination-out';
                tempSalmonCtx.drawImage(salmonEraseCanvas, 0, 0);
                tempSalmonCtx.globalCompositeOperation = 'source-over';
            }

            // マスク・ロゴ・字幕編集モード時はおさかなを55%透過表示（書き出し時・移動モード時は不透明）
            if (!forExport && (currentMode === 'eraseSalmon' || currentMode === 'logo' || currentMode === 'subtitle')) {
                mainCtx.save();
                mainCtx.globalAlpha = 0.55;
                mainCtx.drawImage(tempSalmonCanvas, 0, 0);
                mainCtx.restore();
            } else {
                mainCtx.drawImage(tempSalmonCanvas, 0, 0);
            }
        }

        // ロゴ描画（マスクモード時は非表示、字幕・おさかなモード時は半透明、書き出し時は常に不透明描画）
        const shouldDrawLogo = logoState.visible && (forExport || currentMode !== 'eraseSalmon') && (logoState.line1 || logoState.line2);
        if (shouldDrawLogo) {
            const refDim = bgImage ? Math.max(bgImage.width, bgImage.height) : 800;
            const baseLogoScale = (refDim / 800) * logoState.scale;
            if (!forExport && (currentMode === 'subtitle' || currentMode === 'salmon')) {
                const bounds = getLogoBounds();
                if (bounds) {
                    const bw = Math.max(64, Math.ceil(bounds.localW + 40));
                    const bh = Math.max(64, Math.ceil(bounds.localH + 40));
                    if (tempCompositeCanvas.width !== bw || tempCompositeCanvas.height !== bh) {
                        tempCompositeCanvas.width = bw;
                        tempCompositeCanvas.height = bh;
                    }
                    tempCompositeCtx.clearRect(0, 0, bw, bh);
                    drawPopLogo(
                        tempCompositeCtx,
                        bw / 2,
                        bh / 2,
                        baseLogoScale,
                        0,
                        logoState.line1,
                        logoState.line2
                    );
                    mainCtx.save();
                    mainCtx.globalAlpha = 0.45;
                    mainCtx.translate(logoState.x, logoState.y);
                    mainCtx.rotate((logoState.rotZ * Math.PI) / 180);
                    mainCtx.drawImage(tempCompositeCanvas, -bw / 2, -bh / 2);
                    mainCtx.restore();
                }
            } else {
                drawPopLogo(
                    mainCtx,
                    logoState.x,
                    logoState.y,
                    baseLogoScale,
                    logoState.rotZ,
                    logoState.line1,
                    logoState.line2
                );
            }
        }

        // 字幕描画（マスクモード時は非表示、ロゴ・おさかなモード時は半透明、書き出し時は常に不透明描画）
        const shouldDrawSubtitle = subtitleState.visible && (forExport || currentMode !== 'eraseSalmon') && (subtitleState.line1 || subtitleState.line2);
        if (shouldDrawSubtitle) {
            const refDim = bgImage ? Math.max(bgImage.width, bgImage.height) : 800;
            const baseSubScale = (refDim / 800) * subtitleState.scale;
            if (!forExport && (currentMode === 'logo' || currentMode === 'salmon')) {
                const bounds = getSubtitleBounds();
                if (bounds) {
                    const bw = Math.max(64, Math.ceil(bounds.width + 40));
                    const bh = Math.max(64, Math.ceil(bounds.height + 40));
                    if (tempCompositeCanvas.width !== bw || tempCompositeCanvas.height !== bh) {
                        tempCompositeCanvas.width = bw;
                        tempCompositeCanvas.height = bh;
                    }
                    tempCompositeCtx.clearRect(0, 0, bw, bh);
                    drawSubtitles(
                        tempCompositeCtx,
                        bw / 2,
                        bh / 2,
                        baseSubScale,
                        subtitleState.line1,
                        subtitleState.line2
                    );
                    mainCtx.save();
                    mainCtx.globalAlpha = 0.45;
                    mainCtx.drawImage(tempCompositeCanvas, subtitleState.x - bw / 2, subtitleState.y - bh / 2);
                    mainCtx.restore();
                }
            } else {
                drawSubtitles(
                    mainCtx,
                    subtitleState.x,
                    subtitleState.y,
                    baseSubScale,
                    subtitleState.line1,
                    subtitleState.line2
                );
            }
        }

        if (!forExport) {
            renderOverlay();
        }
    }

    function renderThreeSalmon() {
        if (!activeSalmonGroup || !isSalmonLoaded) return;

        const aspect = salmonAspect || 2.0;
        const diag = Math.sqrt(aspect * aspect + 1.0);
        const cameraBound = diag * 1.15;

        const currentScale = (salmonState.scale && !isNaN(salmonState.scale)) ? salmonState.scale : 1.0;
        const size = Math.max(64, Math.round(512 * currentScale * (cameraBound / 1.15)));

        if (threeCanvas.width !== size || threeCanvas.height !== size) {
            threeCanvas.width = size;
            threeCanvas.height = size;
            threeRenderer.setSize(size, size);
        }

        const radX = (salmonState.rotX * Math.PI) / 180;
        const radY = (salmonState.rotY * Math.PI) / 180;

        activeSalmonGroup.rotation.set(radX, radY, 0);

        threeRenderer.render(threeScene, threeCamera);
    }

    function getUIScale() {
        if (!overlayCanvas || !overlayCanvas.width) return 1.0;
        const rect = overlayCanvas.getBoundingClientRect();
        if (!rect.width) return 1.0;
        return overlayCanvas.width / rect.width;
    }

    function clampLogoPosition() {
        const bounds = getLogoBounds();
        if (!bounds || !bgImage) return;
        const rad = (bounds.rotZ * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const halfW = (bounds.localW / 2) * cos + (bounds.localH / 2) * sin;
        const halfH = (bounds.localW / 2) * sin + (bounds.localH / 2) * cos;
        if (halfW * 2 <= mainCanvas.width) {
            logoState.x = Math.max(halfW, Math.min(mainCanvas.width - halfW, logoState.x));
        } else {
            logoState.x = mainCanvas.width / 2;
        }
        if (halfH * 2 <= mainCanvas.height) {
            logoState.y = Math.max(halfH, Math.min(mainCanvas.height - halfH, logoState.y));
        } else {
            logoState.y = mainCanvas.height / 2;
        }
    }

    function clampSubtitlePosition() {
        if (!bgImage) return;
        const bounds = getSubtitleBounds();
        if (bounds) {
            const halfW = bounds.width / 2;
            const halfH = bounds.height / 2;
            if (halfW * 2 <= mainCanvas.width) {
                subtitleState.x = Math.max(halfW, Math.min(mainCanvas.width - halfW, subtitleState.x));
            } else {
                subtitleState.x = mainCanvas.width / 2;
            }
            if (halfH * 2 <= mainCanvas.height) {
                subtitleState.y = Math.max(halfH, Math.min(mainCanvas.height - halfH, subtitleState.y));
            } else {
                subtitleState.y = mainCanvas.height / 2;
            }
        } else {
            subtitleState.x = Math.max(20, Math.min(mainCanvas.width - 20, subtitleState.x));
            subtitleState.y = Math.max(20, Math.min(mainCanvas.height - 20, subtitleState.y));
        }
    }

    function isNearHandle(pos, handlePos, maxDist = 24) {
        if (!pos || !handlePos) return false;
        const uiScale = getUIScale();
        return Math.hypot(pos.x - handlePos.x, pos.y - handlePos.y) <= maxDist * uiScale;
    }

    function getSubtitleHandlePos() {
        const bounds = getSubtitleBounds();
        if (!bounds) return null;
        return {
            x: bounds.x + bounds.width,
            y: bounds.y,
            angleRad: 0
        };
    }

    function getLogoHandlePos() {
        const bounds = getLogoBounds();
        if (!bounds) return null;
        const radZ = (bounds.rotZ * Math.PI) / 180;
        const cosZ = Math.cos(radZ);
        const sinZ = Math.sin(radZ);
        const lx = bounds.localW / 2;
        const ly = -bounds.localH / 2;
        return {
            x: bounds.cx + lx * cosZ - ly * sinZ,
            y: bounds.cy + lx * sinZ + ly * cosZ,
            angleRad: radZ
        };
    }

    function getSalmonHandlePos() {
        if (!bgImage || !isSalmonLoaded) return null;
        const hash = `${currentFishType}_${Math.round(salmonState.rotX)}_${Math.round(salmonState.rotY)}_${Math.round(salmonState.bulge * 100)}_${Math.round(threeCanvas.width)}`;
        if (hash !== lastContourHash || !cachedFishContourPath) {
            cachedFishContourPath = generateFishContourPath();
            lastContourHash = hash;
        }

        const localPt = cachedFishTopRightLocal || {
            x: (512 * salmonAspect * salmonState.scale) / 2,
            y: -(512 * salmonState.scale) / 2
        };
        const radZ = (salmonState.rotZ * Math.PI) / 180;
        const cosZ = Math.cos(radZ);
        const sinZ = Math.sin(radZ);
        return {
            x: salmonState.x + localPt.x * cosZ - localPt.y * sinZ,
            y: salmonState.y + localPt.x * sinZ + localPt.y * cosZ,
            angleRad: radZ
        };
    }

    function drawResizeHandle(ctx, hx, hy, angleRad = 0, isHovered = false, isActive = false) {
        ctx.save();
        ctx.translate(hx, hy);

        const uiScale = getUIScale();
        const r = (isActive ? 15 : (isHovered ? 14 : 12)) * uiScale;

        // ドロップシャドウ
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 5 * uiScale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2 * uiScale;

        // 白背景の円
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 輪郭線
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 2.0 * uiScale;
        ctx.strokeStyle = isActive ? '#1b5e20' : (isHovered ? '#388e3c' : '#2e7d32');
        ctx.stroke();

        // 斜め双方向リサイズ矢印アイコン（右上がり対角線）
        ctx.rotate(angleRad + Math.PI / 4);

        ctx.strokeStyle = isActive ? '#1b5e20' : (isHovered ? '#388e3c' : '#2e7d32');
        ctx.lineWidth = 1.8 * uiScale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const len = r * 0.52;
        const arrowSz = 3.2 * uiScale;

        // 軸線
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.lineTo(0, len);
        ctx.stroke();

        // 上側矢印
        ctx.beginPath();
        ctx.moveTo(-arrowSz, -len + arrowSz);
        ctx.lineTo(0, -len);
        ctx.lineTo(arrowSz, -len + arrowSz);
        ctx.stroke();

        // 下側矢印
        ctx.beginPath();
        ctx.moveTo(-arrowSz, len - arrowSz);
        ctx.lineTo(0, len);
        ctx.lineTo(arrowSz, len - arrowSz);
        ctx.stroke();

        ctx.restore();
    }

    function updateCanvasCursor(e) {
        if (!bgImage) {
            canvasWorkspace.style.cursor = 'default';
            return;
        }
        if (currentMode === 'eraseSalmon') {
            canvasWorkspace.style.cursor = 'none';
            return;
        }
        if (currentMode === 'crop') {
            canvasWorkspace.style.cursor = isDrawing ? 'grabbing' : 'grab';
            return;
        }

        const pos = getCanvasPos(e);
        const prevHovered = hoveredHandle;
        hoveredHandle = null;

        if (currentMode === 'salmon') {
            if (salmonDragMode === 'move') {
                const hPos = getSalmonHandlePos();
                if (isNearHandle(pos, hPos)) {
                    hoveredHandle = 'salmon';
                    canvasWorkspace.style.cursor = 'nesw-resize';
                } else if (activeDragAction === 'resize') {
                    canvasWorkspace.style.cursor = 'nesw-resize';
                } else {
                    const hit = isInsideSalmonBounds(pos);
                    canvasWorkspace.style.cursor = hit ? (isDrawing ? 'grabbing' : 'grab') : 'default';
                }
            } else {
                canvasWorkspace.style.cursor = isDrawing ? 'grabbing' : 'grab';
            }
        } else if (currentMode === 'logo') {
            if (logoDragMode === 'move') {
                const hPos = getLogoHandlePos();
                if (isNearHandle(pos, hPos)) {
                    hoveredHandle = 'logo';
                    canvasWorkspace.style.cursor = 'nesw-resize';
                } else if (activeDragAction === 'resize') {
                    canvasWorkspace.style.cursor = 'nesw-resize';
                } else {
                    const hit = isInsideLogoBounds(pos);
                    canvasWorkspace.style.cursor = hit ? (isDrawing ? 'grabbing' : 'grab') : 'default';
                }
            } else {
                canvasWorkspace.style.cursor = isDrawing ? 'grabbing' : 'grab';
            }
        } else if (currentMode === 'subtitle') {
            const hPos = getSubtitleHandlePos();
            if (isNearHandle(pos, hPos)) {
                hoveredHandle = 'subtitle';
                canvasWorkspace.style.cursor = 'nesw-resize';
            } else if (activeDragAction === 'resize') {
                canvasWorkspace.style.cursor = 'nesw-resize';
            } else {
                const hit = isInsideSubtitleBounds(pos);
                canvasWorkspace.style.cursor = hit ? (isDrawing ? 'grabbing' : 'grab') : 'default';
            }
        } else {
            canvasWorkspace.style.cursor = 'default';
        }

        if (prevHovered !== hoveredHandle) {
            renderOverlay();
        }
    }

    function getSubtitleBounds() {
        if (!subtitleState.visible) return null;
        const text1 = (subtitleState.line1 || '').trim();
        const text2 = (subtitleState.line2 || '').trim();
        if (!text1 && !text2) return null;

        const refDim = bgImage ? Math.max(bgImage.width, bgImage.height) : 800;
        const scaleRatio = (refDim / 800) * subtitleState.scale;
        let fontSize = Math.round(38 * scaleRatio);
        let lineGap = 12 * scaleRatio;

        const canvasWidth = bgImage ? mainCanvas.width : 800;
        const allowedWidth = canvasWidth * 0.94;

        mainCtx.save();
        mainCtx.font = `900 ${fontSize}px "Noto Serif JP", serif`;
        const w1 = text1 ? mainCtx.measureText(text1).width : 0;
        const w2 = text2 ? mainCtx.measureText(text2).width : 0;
        const maxTextWidth = Math.max(w1, w2);

        if (maxTextWidth > allowedWidth && maxTextWidth > 0) {
            const fitScale = allowedWidth / maxTextWidth;
            fontSize = Math.max(10, Math.floor(fontSize * fitScale));
            lineGap = lineGap * fitScale;
        }
        mainCtx.restore();

        const padX = Math.max(16, 20 * scaleRatio);
        const padY = Math.max(10, 14 * scaleRatio);
        const actualW = maxTextWidth > allowedWidth ? allowedWidth : maxTextWidth;
        const boxW = Math.max(60, actualW + padX * 2);
        const boxH = (text1 && text2) ? (fontSize * 2 + lineGap + padY * 2) : (fontSize + padY * 2);

        return {
            x: subtitleState.x - boxW / 2,
            y: subtitleState.y - boxH / 2,
            width: boxW,
            height: boxH,
            cx: subtitleState.x,
            cy: subtitleState.y
        };
    }

    function isInsideSubtitleBounds(pos) {
        const bounds = getSubtitleBounds();
        if (!bounds) return false;
        return pos.x >= bounds.x && pos.x <= bounds.x + bounds.width &&
            pos.y >= bounds.y && pos.y <= bounds.y + bounds.height;
    }

    function getLogoBounds() {
        if (!logoState.visible) return null;
        const l1 = (logoState.line1 || '').trim();
        const l2 = (logoState.line2 || '').trim();
        if (!l1 && !l2) return null;

        const baseFontSize = 88;
        const lineGap = 72;
        const fontFamily = "'Permanent Marker', cursive, sans-serif";

        mainCtx.save();
        function measureLine(text, isLine1 = false) {
            if (!text) return 0;
            let totalWidth = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const isFirst = (i === 0);
                const scaleFactor = isFirst ? (isLine1 ? 1.48 : 1.25) : 1.0;
                const fontSz = baseFontSize * scaleFactor;
                mainCtx.font = `900 ${fontSz}px ${fontFamily}`;
                const metrics = mainCtx.measureText(char);
                totalWidth += metrics.width * 0.97;
            }
            return totalWidth;
        }

        const line1W = measureLine(l1, true);
        const line2W = measureLine(l2, false);
        const maxLineW = Math.max(line1W, line2W);

        mainCtx.font = `900 ${baseFontSize * 1.85}px ${fontFamily}`;
        const exMarkW = mainCtx.measureText('!').width * 1.1;
        mainCtx.restore();

        const totalW = maxLineW + exMarkW + 15;
        const totalH = lineGap + baseFontSize * 1.3;

        const refDim = bgImage ? Math.max(bgImage.width, bgImage.height) : 800;
        const baseLogoScale = (refDim / 800) * logoState.scale;

        const scaledTextWidth = totalW * baseLogoScale;
        const maxAllowedWidth = (bgImage ? mainCanvas.width : 800) * 0.88;
        let autoFitScale = 1.0;
        if (scaledTextWidth > maxAllowedWidth) {
            autoFitScale = maxAllowedWidth / scaledTextWidth;
        }
        const finalScale = baseLogoScale * autoFitScale;

        const padX = Math.max(20, 24 * finalScale);
        const padY = Math.max(16, 20 * finalScale);
        const localW = totalW * finalScale + padX * 2;
        const localH = totalH * finalScale + padY * 2;

        return {
            cx: logoState.x,
            cy: logoState.y,
            rotZ: logoState.rotZ,
            localW: localW,
            localH: localH
        };
    }

    function isInsideLogoBounds(pos) {
        const bounds = getLogoBounds();
        if (!bounds) return false;

        const dx = pos.x - bounds.cx;
        const dy = pos.y - bounds.cy;
        const radZ = (bounds.rotZ * Math.PI) / 180;
        const localX = dx * Math.cos(-radZ) - dy * Math.sin(-radZ);
        const localY = dx * Math.sin(-radZ) + dy * Math.cos(-radZ);

        return Math.abs(localX) <= bounds.localW / 2 && Math.abs(localY) <= bounds.localH / 2;
    }

    let cachedFishContourPath = null;
    let cachedFishTopRightLocal = null;
    let lastContourHash = '';

    function generateFishContourPath() {
        if (!threeCanvas || !threeCanvas.width || !threeCanvas.height) return null;

        const targetDim = 128;
        const scale = targetDim / Math.max(threeCanvas.width, threeCanvas.height);
        const tw = Math.max(32, Math.round(threeCanvas.width * scale));
        const th = Math.max(32, Math.round(threeCanvas.height * scale));

        if (contourOffCanvas.width !== tw || contourOffCanvas.height !== th) {
            contourOffCanvas.width = tw;
            contourOffCanvas.height = th;
        }
        contourOffCtx.clearRect(0, 0, tw, th);
        contourOffCtx.drawImage(threeCanvas, 0, 0, tw, th);

        let imgData;
        try {
            imgData = contourOffCtx.getImageData(0, 0, tw, th);
        } catch (e) {
            return null;
        }
        const data = imgData.data;

        const grid = new Uint8Array(tw * th);
        const dilated = new Uint8Array(tw * th);

        for (let y = 0; y < th; y++) {
            for (let x = 0; x < tw; x++) {
                const idx = (y * tw + x) * 4;
                if (data[idx + 3] > 25) {
                    grid[y * tw + x] = 1;
                }
            }
        }

        // 輪郭から少し離すためのディレーション（膨張処理 r=2）
        const r = 2;
        for (let y = 0; y < th; y++) {
            for (let x = 0; x < tw; x++) {
                if (grid[y * tw + x]) {
                    for (let dy = -r; dy <= r; dy++) {
                        const ny = y + dy;
                        if (ny < 0 || ny >= th) continue;
                        for (let dx = -r; dx <= r; dx++) {
                            const nx = x + dx;
                            if (nx < 0 || nx >= tw) continue;
                            if (dx * dx + dy * dy <= r * r + 1) {
                                dilated[ny * tw + nx] = 1;
                            }
                        }
                    }
                }
            }
        }

        // Moore-Neighbor 輪郭トレース
        let startX = -1, startY = -1;
        for (let y = 0; y < th; y++) {
            for (let x = 0; x < tw; x++) {
                if (dilated[y * tw + x]) {
                    startX = x;
                    startY = y;
                    break;
                }
            }
            if (startX !== -1) break;
        }

        if (startX === -1) return null;

        const points = [];
        const dxs = [0, 1, 1, 1, 0, -1, -1, -1];
        const dys = [-1, -1, 0, 1, 1, 1, 0, -1];

        let cx = startX;
        let cy = startY;
        const maxSteps = tw * th;
        let steps = 0;

        points.push({ x: cx, y: cy });

        let prevBackDir = 6;

        while (steps < maxSteps) {
            steps++;
            let found = false;
            let startSearch = (prevBackDir + 1) % 8;

            for (let i = 0; i < 8; i++) {
                const checkDir = (startSearch + i) % 8;
                const nx = cx + dxs[checkDir];
                const ny = cy + dys[checkDir];

                if (nx >= 0 && nx < tw && ny >= 0 && ny < th && dilated[ny * tw + nx]) {
                    cx = nx;
                    cy = ny;
                    prevBackDir = (checkDir + 4) % 8;
                    found = true;
                    break;
                }
            }

            if (!found) break;
            if (cx === startX && cy === startY) break;

            points.push({ x: cx, y: cy });
        }

        if (points.length < 3) return null;

        // サブサンプリング（なめらかな曲線用）
        const step = Math.max(1, Math.floor(points.length / 80));
        const subsampled = [];
        for (let i = 0; i < points.length; i += step) {
            subsampled.push(points[i]);
        }
        if (subsampled.length < 3) return null;

        const invScale = 1.0 / scale;
        const halfW = threeCanvas.width / 2;
        const halfH = threeCanvas.height / 2;

        const path = new Path2D();
        const len = subsampled.length;

        // 輪郭上の最も右上（x - y が最大となる点）を検出
        let maxScore = -Infinity;
        let bestLocalX = 0;
        let bestLocalY = 0;

        // Catmull-Rom スプライン曲線補間
        for (let i = 0; i < len; i++) {
            const p0 = subsampled[(i - 1 + len) % len];
            const p1 = subsampled[i];
            const p2 = subsampled[(i + 1) % len];
            const p3 = subsampled[(i + 2) % len];

            const x1 = p1.x * invScale - halfW;
            const y1 = p1.y * invScale - halfH;

            // スコア算出（上側が負、右側が正）
            const score = x1 - y1;
            if (score > maxScore) {
                maxScore = score;
                bestLocalX = x1;
                bestLocalY = y1;
            }

            if (i === 0) {
                path.moveTo(x1, y1);
            }

            const cp1x = p1.x * invScale - halfW + (p2.x - p0.x) * invScale / 6;
            const cp1y = p1.y * invScale - halfH + (p2.y - p0.y) * invScale / 6;
            const cp2x = p2.x * invScale - halfW - (p3.x - p1.x) * invScale / 6;
            const cp2y = p2.y * invScale - halfH - (p3.y - p1.y) * invScale / 6;
            const x2 = p2.x * invScale - halfW;
            const y2 = p2.y * invScale - halfH;

            path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        }

        path.closePath();

        // ハンドル位置として輪郭の右上端をキャッシュ
        cachedFishTopRightLocal = {
            x: bestLocalX + 6,
            y: bestLocalY - 6
        };

        return path;
    }

    function isInsideSalmonBounds(pos) {
        if (!bgImage || !isSalmonLoaded || !threeCanvas || !threeRenderer) return false;

        const dx = pos.x - salmonState.x;
        const dy = pos.y - salmonState.y;
        const radZ = (salmonState.rotZ * Math.PI) / 180;
        const localX = dx * Math.cos(-radZ) - dy * Math.sin(-radZ);
        const localY = dx * Math.sin(-radZ) + dy * Math.cos(-radZ);

        const halfW = threeCanvas.width / 2;
        const halfH = threeCanvas.height / 2;
        const u = Math.round(localX + halfW);
        const v = Math.round(localY + halfH);

        if (u < 0 || u >= threeCanvas.width || v < 0 || v >= threeCanvas.height) {
            return false;
        }

        // マスクで消去されている箇所はタッチ無効
        if (salmonEraseCanvas.width > 0) {
            try {
                const erasePixel = salmonEraseCtx.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
                if (erasePixel[3] > 60) {
                    return false;
                }
            } catch (e) { }
        }

        const gl = threeRenderer.getContext();
        if (!gl) return false;

        const glY = threeCanvas.height - 1 - v;
        const pixel = new Uint8Array(4);
        gl.readPixels(u, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        return pixel[3] > 20;
    }

    function drawSubtitleDashedBox(ctx) {
        if (currentMode !== 'subtitle' || !subtitleState.visible) return;
        const bounds = getSubtitleBounds();
        if (!bounds) return;

        const uiScale = getUIScale();

        ctx.save();
        const radius = Math.min(8 * uiScale, bounds.height / 4);
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, radius);
        } else {
            ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        }

        // Pass 1: 白縁取り
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = (isDrawing ? 4.2 : 3.4) * uiScale;
        ctx.setLineDash([8 * uiScale, 6 * uiScale]);
        ctx.stroke();

        // Pass 2: 緑色点線
        ctx.strokeStyle = isDrawing ? 'rgba(76, 175, 80, 0.95)' : 'rgba(46, 125, 50, 0.9)';
        ctx.lineWidth = (isDrawing ? 2.4 : 1.8) * uiScale;
        ctx.setLineDash([8 * uiScale, 6 * uiScale]);
        ctx.stroke();
        ctx.restore();

        const hPos = getSubtitleHandlePos();
        if (hPos) {
            const isHovered = hoveredHandle === 'subtitle';
            const isActive = activeDragAction === 'resize' && currentMode === 'subtitle';
            drawResizeHandle(ctx, hPos.x, hPos.y, hPos.angleRad, isHovered, isActive);
        }
    }

    function drawLogoDashedBox(ctx) {
        if (currentMode !== 'logo' || !logoState.visible || logoDragMode !== 'move') return;
        const bounds = getLogoBounds();
        if (!bounds) return;

        const uiScale = getUIScale();

        ctx.save();
        ctx.translate(bounds.cx, bounds.cy);
        ctx.rotate((bounds.rotZ * Math.PI) / 180);

        const rx = -bounds.localW / 2;
        const ry = -bounds.localH / 2;
        const radius = Math.min(8 * uiScale, bounds.localH / 4);

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(rx, ry, bounds.localW, bounds.localH, radius);
        } else {
            ctx.rect(rx, ry, bounds.localW, bounds.localH);
        }

        // Pass 1: 白縁取り
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = (isDrawing ? 4.2 : 3.4) * uiScale;
        ctx.setLineDash([8 * uiScale, 6 * uiScale]);
        ctx.stroke();

        // Pass 2: 緑色点線
        ctx.strokeStyle = isDrawing ? 'rgba(76, 175, 80, 0.95)' : 'rgba(46, 125, 50, 0.9)';
        ctx.lineWidth = (isDrawing ? 2.4 : 1.8) * uiScale;
        ctx.setLineDash([8 * uiScale, 6 * uiScale]);
        ctx.stroke();
        ctx.restore();

        const hPos = getLogoHandlePos();
        if (hPos) {
            const isHovered = hoveredHandle === 'logo';
            const isActive = activeDragAction === 'resize' && currentMode === 'logo';
            drawResizeHandle(ctx, hPos.x, hPos.y, hPos.angleRad, isHovered, isActive);
        }
    }

    function drawSalmonMoveGuide(ctx) {
        if (currentMode !== 'salmon' || salmonDragMode !== 'move' || !bgImage || !isSalmonLoaded) return;

        const hash = `${currentFishType}_${Math.round(salmonState.rotX)}_${Math.round(salmonState.rotY)}_${Math.round(salmonState.bulge * 100)}_${Math.round(threeCanvas.width)}`;
        if (hash !== lastContourHash || !cachedFishContourPath) {
            cachedFishContourPath = generateFishContourPath();
            lastContourHash = hash;
        }

        if (cachedFishContourPath) {
            const uiScale = getUIScale();
            ctx.save();
            ctx.translate(salmonState.x, salmonState.y);
            ctx.rotate((salmonState.rotZ * Math.PI) / 180);

            // Pass 1: 白縁取り
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = (isDrawing ? 4.2 : 3.4) * uiScale;
            ctx.setLineDash([8 * uiScale, 6 * uiScale]);
            ctx.stroke(cachedFishContourPath);

            // Pass 2: 緑色点線
            ctx.strokeStyle = isDrawing ? 'rgba(76, 175, 80, 0.95)' : 'rgba(46, 125, 50, 0.9)';
            ctx.lineWidth = (isDrawing ? 2.4 : 1.8) * uiScale;
            ctx.setLineDash([8 * uiScale, 6 * uiScale]);
            ctx.stroke(cachedFishContourPath);

            ctx.restore();
        }

        const hPos = getSalmonHandlePos();
        if (hPos) {
            const isHovered = hoveredHandle === 'salmon';
            const isActive = activeDragAction === 'resize' && currentMode === 'salmon';
            drawResizeHandle(ctx, hPos.x, hPos.y, hPos.angleRad, isHovered, isActive);
        }
    }

    function renderOverlay() {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (!bgImage) return;

        if (currentMode === 'eraseSalmon' && salmonEraseCanvas.width > 0) {
            const tempOverlay = document.createElement('canvas');
            tempOverlay.width = overlayCanvas.width;
            tempOverlay.height = overlayCanvas.height;
            const tCtx = tempOverlay.getContext('2d');

            tCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            tCtx.fillRect(0, 0, tempOverlay.width, tempOverlay.height);

            tCtx.globalCompositeOperation = 'destination-in';
            tCtx.drawImage(salmonEraseCanvas, 0, 0);

            overlayCtx.drawImage(tempOverlay, 0, 0);
        }

        drawRotationGuideRing(overlayCtx);
        drawSalmonMoveGuide(overlayCtx);
        drawLogoDashedBox(overlayCtx);
        drawSubtitleDashedBox(overlayCtx);
        drawCropGuideOverlay(overlayCtx);

        if (bonitoParticles.length > 0) {
            bonitoParticles.forEach(p => drawBonitoFlake(overlayCtx, p));
        }
    }

    function drawRotationGuideRing(ctx) {
        if (!bgImage) return;

        let cx = 0, cy = 0;
        let rotZ = 0;
        let handleRotZ = 0;
        let radius = 100;
        let modeType = '';

        if (currentMode === 'salmon') {
            if (salmonDragMode === 'rotate2d') {
                cx = salmonState.x;
                cy = salmonState.y;
                rotZ = salmonState.rotZ;
                handleRotZ = salmonState.handleRotZ !== undefined ? salmonState.handleRotZ : salmonState.rotZ;
                const baseScale = getBaseSalmonScale(bgImage.width) || 1;
                const relativeScale = salmonState.scale / baseScale;
                radius = Math.max(70, Math.min(mainCanvas.width * 0.4, 130 * relativeScale));
                modeType = '2d';
            } else if (salmonDragMode === 'rotate') {
                cx = salmonState.x;
                cy = salmonState.y;
                const baseScale = getBaseSalmonScale(bgImage.width) || 1;
                const relativeScale = salmonState.scale / baseScale;
                radius = Math.max(70, Math.min(mainCanvas.width * 0.4, 130 * relativeScale));
                modeType = '3d';
            } else {
                return;
            }
        } else if (currentMode === 'logo' && logoDragMode === 'rotate') {
            cx = logoState.x;
            cy = logoState.y;
            rotZ = logoState.rotZ;
            handleRotZ = logoState.handleRotZ !== undefined ? logoState.handleRotZ : logoState.rotZ;
            radius = Math.max(70, Math.min(mainCanvas.width * 0.4, 130 * logoState.scale));
            modeType = '2d';
        } else {
            return;
        }

        const uiScale = getUIScale();
        ctx.save();

        if (modeType === '2d') {
            const themeColor = '#2e7d32';
            const activeColor = '#4caf50';

            ctx.beginPath();
            ctx.arc(cx, cy, 5 * uiScale, 0, Math.PI * 2);
            ctx.fillStyle = isDrawing ? activeColor : themeColor;
            ctx.shadowColor = 'rgba(46, 125, 50, 0.6)';
            ctx.shadowBlur = 8 * uiScale;
            ctx.fill();

            // Pass 1: 白縁取り
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = (isDrawing ? 5.2 : 4.2) * uiScale;
            ctx.setLineDash([8 * uiScale, 6 * uiScale]);
            ctx.stroke();

            // Pass 2: 緑色点線
            ctx.strokeStyle = isDrawing ? 'rgba(76, 175, 80, 0.95)' : 'rgba(46, 125, 50, 0.9)';
            ctx.lineWidth = (isDrawing ? 3.4 : 2.4) * uiScale;
            ctx.setLineDash([8 * uiScale, 6 * uiScale]);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, radius + 4 * uiScale, 0, Math.PI * 2);
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(46, 125, 50, 0.3)';
            ctx.lineWidth = 1 * uiScale;
            ctx.stroke();

            const radZ = (handleRotZ - 90) * (Math.PI / 180);
            const knobX = cx + radius * Math.cos(radZ);
            const knobY = cy + radius * Math.sin(radZ);

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(knobX, knobY);
            ctx.strokeStyle = 'rgba(46, 125, 50, 0.45)';
            ctx.lineWidth = 1.5 * uiScale;
            ctx.setLineDash([4 * uiScale, 4 * uiScale]);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(knobX, knobY, (isDrawing ? 16 : 14) * uiScale, 0, Math.PI * 2);
            ctx.fillStyle = isDrawing ? '#2e7d32' : '#ffffff';
            ctx.strokeStyle = isDrawing ? '#ffffff' : '#2e7d32';
            ctx.lineWidth = 3 * uiScale;
            ctx.shadowColor = isDrawing ? 'rgba(76, 175, 80, 0.9)' : 'rgba(46, 125, 50, 0.6)';
            ctx.shadowBlur = (isDrawing ? 12 : 8) * uiScale;
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(knobX, knobY, 4 * uiScale, 0, Math.PI * 2);
            ctx.fillStyle = isDrawing ? '#ffffff' : '#2e7d32';
            ctx.shadowBlur = 0;
            ctx.fill();

        } else if (modeType === '3d') {
            const themeColor = '#2e7d32';

            ctx.beginPath();
            ctx.arc(cx, cy, 5 * uiScale, 0, Math.PI * 2);
            ctx.fillStyle = themeColor;
            ctx.shadowColor = 'rgba(46, 125, 50, 0.6)';
            ctx.shadowBlur = 8 * uiScale;
            ctx.fill();

            // Pass 1: 白縁取り
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = (isDrawing ? 5.2 : 4.2) * uiScale;
            ctx.setLineDash([8 * uiScale, 6 * uiScale]);
            ctx.stroke();

            // Pass 2: 緑色点線
            ctx.strokeStyle = isDrawing ? 'rgba(76, 175, 80, 0.95)' : 'rgba(46, 125, 50, 0.9)';
            ctx.lineWidth = (isDrawing ? 3.4 : 2.4) * uiScale;
            ctx.setLineDash([8 * uiScale, 6 * uiScale]);
            ctx.stroke();

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((salmonState.rotZ * Math.PI) / 180);
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius * 0.35, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(46, 125, 50, 0.45)';
            ctx.lineWidth = 1.5 * uiScale;
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.35, radius, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(46, 125, 50, 0.45)';
            ctx.lineWidth = 1.5 * uiScale;
            ctx.stroke();

            const directions = [
                { x: 0, y: -radius },
                { x: radius, y: 0 },
                { x: 0, y: radius },
                { x: -radius, y: 0 }
            ];

            directions.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, (isDrawing ? 10 : 8) * uiScale, 0, Math.PI * 2);
                ctx.fillStyle = isDrawing ? '#2e7d32' : '#ffffff';
                ctx.strokeStyle = isDrawing ? '#ffffff' : '#2e7d32';
                ctx.lineWidth = 2.5 * uiScale;
                ctx.shadowColor = 'rgba(46, 125, 50, 0.6)';
                ctx.shadowBlur = 6 * uiScale;
                ctx.fill();
                ctx.stroke();
            });
            ctx.restore();
        }

        ctx.restore();
    }

    function drawCropGuideOverlay(ctx) {
        if (currentMode !== 'crop' || !bgImage) return;

        const w = overlayCanvas.width;
        const h = overlayCanvas.height;
        const uiScale = getUIScale();

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1 * uiScale;
        ctx.setLineDash([4 * uiScale, 4 * uiScale]);

        ctx.beginPath();
        ctx.moveTo(w / 3, 0); ctx.lineTo(w / 3, h);
        ctx.moveTo((w * 2) / 3, 0); ctx.lineTo((w * 2) / 3, h);
        ctx.moveTo(0, h / 3); ctx.lineTo(w, h / 3);
        ctx.moveTo(0, (h * 2) / 3); ctx.lineTo(w, (h * 2) / 3);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = isDrawing ? '#4caf50' : '#2e7d32';
        ctx.lineWidth = 3 * uiScale;
        ctx.strokeRect(0, 0, w, h);

        const bracketLen = 24 * uiScale;
        ctx.lineWidth = 4 * uiScale;
        ctx.strokeStyle = isDrawing ? '#4caf50' : '#2e7d32';

        ctx.beginPath();
        ctx.moveTo(0, bracketLen); ctx.lineTo(0, 0); ctx.lineTo(bracketLen, 0);
        ctx.moveTo(w - bracketLen, 0); ctx.lineTo(w, 0); ctx.lineTo(w, bracketLen);
        ctx.moveTo(0, h - bracketLen); ctx.lineTo(0, h); ctx.lineTo(bracketLen, h);
        ctx.moveTo(w - bracketLen, h); ctx.lineTo(w, h); ctx.lineTo(w, h - bracketLen);
        ctx.stroke();

        ctx.restore();
    }

    // --- トースト通知 ---
    let toastTimeout;
    function showToast(msg, duration = 2500) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    // --- 画像生成・ダウンロード・シェア ---
    generateBtn.addEventListener('click', () => {
        if (isNgWordDetected) {
            showToast('不適切な文字または表現が含まれているため画像を生成できません');
            return;
        }

        if (!bgImage) {
            showToast('背景画像が読み込まれていません。');
            return;
        }

        if (modalLoading) modalLoading.style.display = 'flex';
        if (modalBodyContent) modalBodyContent.style.display = 'none';

        if (modalLoading) {
            const spinner = modalLoading.querySelector('.spinner');
            if (spinner) {
                spinner.style.animation = 'none';
                void spinner.offsetWidth;
                spinner.style.animation = '';
            }
        }

        resultModal.classList.add('open');

        requestAnimationFrame(() => {
            setTimeout(() => {
                try {
                    renderAll(true);

                    const dataUrl = mainCanvas.toDataURL('image/png');
                    resultImage.src = dataUrl;
                    downloadBtn.href = dataUrl;

                    renderAll(false);

                    const fishName = FISH_CONFIGS[currentFishType].name;
                    const tweetText = encodeURIComponent(`${fishName}を召喚しました！\n#ウマ娘 #なんでもSHAKEROCKメーカー`);
                    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
                    if (twitterShareBtn) {
                        twitterShareBtn.href = tweetUrl;
                    }

                    if (modalLoading) modalLoading.style.display = 'none';
                    if (modalBodyContent) modalBodyContent.style.display = 'block';
                } catch (err) {
                    console.error('Image generation error:', err);
                    showToast('画像の生成に失敗しました');
                    resultModal.classList.remove('open');
                }
            }, 50);
        });
    });

    closeModalBtn.addEventListener('click', () => {
        resultModal.classList.remove('open');
    });

    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            resultModal.classList.remove('open');
        }
    });

    downloadBtn.addEventListener('click', () => {
        showToast('画像をダウンロードしました');
    });

    copyImgBtn.addEventListener('click', async () => {
        try {
            mainCanvas.toBlob(async (blob) => {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showToast('画像をクリップボードにコピーしました');
            });
        } catch (err) {
            showToast('画像のコピーに失敗しました。ダウンロードボタンをご利用ください。');
        }
    });
});
