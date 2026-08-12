/**
 * ウマ娘 なんでもサーモンサモナー - Application Logic
 * @author @nyaftama
 * @version 0.90c
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
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
    const maskToolToggleRow = document.getElementById('maskToolToggleRow');
    const overlaySelectors = document.querySelectorAll('.canvas-overlay-drag-selector');
    const dragModeRadioInputs = document.querySelectorAll('input[name="salmonDragMode"]');
    const maskToolRadioInputs = document.querySelectorAll('input[name="maskToolMode"]');
    const fishTypeRadioInputs = document.querySelectorAll('input[name="fishType"]');

    const eraserToolsCard = document.getElementById('eraserToolsCard');
    const brushSizeInput = document.getElementById('brushSize');
    const brushSizeVal = document.getElementById('brushSizeVal');
    const undoEraseBtn = document.getElementById('undoEraseBtn');
    const clearEraseBtn = document.getElementById('clearEraseBtn');

    // Salmon Controls
    const salmonScaleInput = document.getElementById('salmonScale');
    const salmonScaleVal = document.getElementById('salmonScaleVal');
    const salmonRotZInput = document.getElementById('salmonRotZ');
    const salmonRotZVal = document.getElementById('salmonRotZVal');
    const salmonBulgeInput = document.getElementById('salmonBulge');
    const salmonBulgeVal = document.getElementById('salmonBulgeVal');
    const lightColorInput = document.getElementById('lightColor');
    const resetSalmonBtn = document.getElementById('resetSalmonBtn');

    // Export Controls & Modal
    const generateBtn = document.getElementById('generateBtn');
    const resultModal = document.getElementById('resultModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const twitterShareBtn = document.getElementById('twitterShareBtn');
    const copyImgBtn = document.getElementById('copyImgBtn');
    const toast = document.getElementById('toast');

    const MAX_IMAGE_DIMENSION = 1920; // Auto-downscale high-res images to max 1920px for optimal performance
    let brushPreviewTimeout;

    // Prevent click & touch event propagation on canvas overlay UI elements
    overlaySelectors.forEach(overlay => {
        ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'click'].forEach(eventType => {
            overlay.addEventListener(eventType, (e) => {
                e.stopPropagation();
            });
        });
    });

    // Smooth Scroll Helper to "おさかなエディター" (Matching uma-new-era-title)
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

    // Auto-downscale high-resolution images so the longest side does not exceed 1920px
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

    // --- Bonito Flakes Particle System (鰹の削り節エフェクト) ---
    let bonitoParticles = [];
    let isParticleLoopRunning = false;

    function spawnBonitoFlakes(x, y, actualBrushSize) {
        const count = 2 + Math.floor(Math.random() * 2); // 2-3 flakes per stroke step
        const colors = [
            'rgba(215, 120, 70, 0.85)',
            'rgba(190, 85, 40, 0.8)',
            'rgba(235, 150, 95, 0.85)',
            'rgba(175, 75, 30, 0.8)'
        ];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2.2;
            const spread = (actualBrushSize / 2) * (0.2 + Math.random() * 0.8);

            bonitoParticles.push({
                x: x + Math.cos(angle) * spread,
                y: y + Math.sin(angle) * spread,
                vx: Math.cos(angle) * speed * 0.4 + (Math.random() - 0.5) * 1.2,
                vy: Math.sin(angle) * speed * 0.4 - 1.2 - Math.random() * 1.5, // gentle upward burst
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.25,
                size: 5 + Math.random() * 8, // 5px to 13px size
                scaleX: 1.0 + (Math.random() - 0.5) * 0.4,
                scaleY: 0.4 + (Math.random() - 0.5) * 0.2,
                life: 1.0,
                decay: 0.035 + Math.random() * 0.025, // fades out in ~0.3s to 0.5s
                alpha: 0.8 + Math.random() * 0.2,
                color: colors[Math.floor(Math.random() * colors.length)]
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
            p.vy += 0.12; // gentle gravity
            p.vx *= 0.96; // air resistance
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

        // Curved shaving ellipse body
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Delicate translucent highlight edge
        ctx.strokeStyle = 'rgba(255, 220, 180, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // --- Fish Asset Definitions ---
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
    const fishCache = {}; // Cache processed Three.js assets per fish type
    let isSalmonLoaded = false; // State flag for loaded 3D fish mesh

    // --- State Variables ---
    let bgImage = null;
    let salmonAspect = 2.0;

    // Salmon Erase Mask Offscreen Canvas
    let salmonEraseCanvas = document.createElement('canvas');
    let salmonEraseCtx = salmonEraseCanvas.getContext('2d');

    // State
    let currentMode = 'salmon'; // 'salmon' | 'eraseSalmon'
    let salmonDragMode = 'move'; // 'move' | 'rotate'
    let currentTool = 'erase'; // 'erase' | 'restore'
    let brushSizePct = 3.0; // 0.1% resolution-independent unit
    let isDrawing = false;
    let lastDrawPos = null;
    let lastScreenPos = null; // Screen-space drag coordinate for resolution-independent rotation

    // Undo stack for salmon eraser
    const eraseUndoStack = [];

    // Salmon 3D State (Default bulge 0.35 = 35%)
    const salmonState = {
        x: 0,
        y: 0,
        scale: 1.0,
        bulge: 0.35, // 35% default depth
        rotX: 0,
        rotY: 0,
        rotZ: 0 // 2D rotation angle around Z-axis
    };

    // Three.js Setup
    let threeScene, threeCamera, threeRenderer;
    let ambientLight, dirLight;
    let activeSalmonGroup = null;
    let threeCanvas = document.createElement('canvas');

    initThreeJS();

    // Load initial default fish ("tuna")
    loadFishAsset('tuna', () => {
        loadFishAsset('salmon'); // Pre-cache salmon in background
    });

    // Calculate resolution-independent brush size in canvas pixels
    function getActualBrushPixelSize() {
        if (!mainCanvas.width) return 30;
        const baseDim = Math.max(mainCanvas.width, mainCanvas.height);
        return Math.max(2, (brushSizePct / 100) * baseDim);
    }

    // Schedule render on next frame to ensure WebGL buffer is fully flushed & compiled
    function requestRender() {
        renderAll();
        requestAnimationFrame(() => {
            renderAll();
        });
    }

    // --- Three.js Initialization ---
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

        // Lighting
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

                // 1. Create pre-flipped texture for back side
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

                // 2. Generate Distance Transform Map for Front
                const distCanvasFront = generateDistanceTransformCanvas(img);
                const distanceTextureFront = new THREE.CanvasTexture(distCanvasFront);
                distanceTextureFront.minFilter = THREE.LinearFilter;
                distanceTextureFront.magFilter = THREE.LinearFilter;

                // 3. Generate Matching Flipped Distance Transform Map for Back
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

                // 4. Build 3D Mesh Group
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

        // alphaTest: 0.2 discards transparent edge cliff polygons completely
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

        // Calculate maximum diagonal half-length so 2D/3D rotation NEVER clips at 90 deg or any angle
        const diag = Math.sqrt(salmonAspect * salmonAspect + 1.0);
        const cameraBound = diag * 1.15;

        // Square frustum ensures 360-degree rotation without clipping
        threeCamera.left = -cameraBound;
        threeCamera.right = cameraBound;
        threeCamera.top = cameraBound;
        threeCamera.bottom = -cameraBound;
        threeCamera.updateProjectionMatrix();

        isSalmonLoaded = true;

        if (!bgImage) {
            loadDemoImage();
        } else {
            // Recalculate scale for new fish aspect ratio
            const currentPct = parseInt(salmonScaleInput.value, 10) || 100;
            const baseScale = getBaseSalmonScale(bgImage.width);
            salmonState.scale = (currentPct / 100) * baseScale;
            requestRender();
        }
    }

    // --- Distance Transform Map Generator for Contour Bulging ---
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

        // Downsampled grid for fast distance computation
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

        // 2-pass Chamfer distance transform (8-neighbor)
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

            // Ultra-smooth sine curve + exponent power falloff prevents steep edge cliffs
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

    // --- Image Handling & Upload (HEIC/HEIF Supported matching uma-new-era-title) ---
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

    // Default plain background canvas
    function loadDemoImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);

        const demoImg = new Image();
        demoImg.onload = () => setBgImage(demoImg, false);
        demoImg.src = canvas.toDataURL('image/png');
    }

    function getBaseSalmonScale(canvasWidth) {
        // 100% baseline scale is set to 1.45x of previous base size
        const targetWidth = canvasWidth * 0.90 * 1.45;
        return targetWidth / (512 * salmonAspect);
    }

    function setBgImage(img, shouldScroll = true) {
        bgImage = img;

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

        updateSalmonSliderUI();
        updateBrushCursorSize();
        requestRender();

        if (shouldScroll) {
            scrollToEditor();
        }
    }

    // --- Mode & Tool Controls ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;

            if (currentMode === 'salmon') {
                salmonDragToggleRow.style.display = 'flex';
                maskToolToggleRow.style.display = 'none';
                eraserToolsCard.style.display = 'none';
            } else if (currentMode === 'eraseSalmon') {
                salmonDragToggleRow.style.display = 'none';
                maskToolToggleRow.style.display = 'flex';
                eraserToolsCard.style.display = 'block';
            }

            requestRender();
        });
    });

    // Radio Group Drag Mode Toggle (Move vs Rotate)
    dragModeRadioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            salmonDragMode = e.target.value;
        });
    });

    // Radio Group Mask Tool Toggle (Erase vs Restore overlay)
    maskToolRadioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentTool = e.target.value;
        });
    });

    // Radio Group Fish Type Switcher (Thisマグロ vs シャケ)
    fishTypeRadioInputs.forEach(radio => {
        radio.addEventListener('change', (e) => {
            activateFishType(e.target.value);
            showToast(`${FISH_CONFIGS[e.target.value].name} に切り替えました`);
        });
    });

    // Interactive Brush Size Slider Preview Handling
    brushSizeInput.addEventListener('input', (e) => {
        brushSizePct = parseFloat(e.target.value) || 3.0;
        brushSizeVal.textContent = `${brushSizePct.toFixed(1)}%`;
        updateBrushCursorSize();

        // Display live brush circle preview in the center of the canvas during slider drag
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

    undoEraseBtn.addEventListener('click', () => undoSalmonErase());
    clearEraseBtn.addEventListener('click', () => clearSalmonErase());

    // --- Salmon 3D Controls (Scale, 2D Rotation, Bulge, & Light Color) ---
    salmonScaleInput.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10);
        salmonScaleVal.textContent = `${pct}%`;
        if (bgImage) {
            const baseScale = getBaseSalmonScale(bgImage.width);
            salmonState.scale = (pct / 100) * baseScale;
            renderAll();
        }
    });

    salmonRotZInput.addEventListener('input', (e) => {
        const deg = parseInt(e.target.value, 10);
        salmonRotZVal.textContent = `${deg}°`;
        salmonState.rotZ = deg;
        renderAll();
    });

    salmonBulgeInput.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10);
        salmonBulgeVal.textContent = `${pct}%`;
        salmonState.bulge = pct / 100;

        // Apply new displacementScale across all cached fish materials
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

    // Light Color Picker Listener
    if (lightColorInput) {
        lightColorInput.addEventListener('input', (e) => {
            const hexColor = e.target.value;
            if (dirLight) dirLight.color.set(hexColor);
            if (ambientLight) ambientLight.color.set(hexColor);
            renderAll();
        });
    }

    resetSalmonBtn.addEventListener('click', () => {
        resetSalmonState();
        requestRender();
        showToast('位置・角度・ライティングをリセットしました');
    });

    function resetSalmonState() {
        if (bgImage) {
            salmonState.x = bgImage.width / 2;
            salmonState.y = bgImage.height / 2;
            salmonState.scale = getBaseSalmonScale(bgImage.width);
        }
        salmonState.bulge = 0.35;
        salmonState.rotX = 0;
        salmonState.rotY = 0;
        salmonState.rotZ = 0;

        if (lightColorInput) lightColorInput.value = '#ffffff';
        if (dirLight) dirLight.color.set('#ffffff');
        if (ambientLight) ambientLight.color.set('#ffffff');

        // Reset material displacement scale across cache
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
        salmonRotZInput.value = 0;
        salmonRotZVal.textContent = '0°';
        salmonBulgeInput.value = Math.round(salmonState.bulge * 100);
        salmonBulgeVal.textContent = `${Math.round(salmonState.bulge * 100)}%`;
        if (lightColorInput) lightColorInput.value = '#ffffff';
    }

    // --- Interactive Canvas Mouse & Touch Drag Handling ---
    canvasWorkspace.addEventListener('mouseenter', () => {
        if (currentMode !== 'salmon') brushCursor.style.display = 'block';
    });

    canvasWorkspace.addEventListener('mouseleave', () => {
        brushCursor.style.display = 'none';
        isDrawing = false;
    });

    canvasWorkspace.addEventListener('mousemove', (e) => {
        updateBrushCursorPos(e);
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

        if (currentMode !== 'salmon') {
            saveSalmonEraseUndoState();
            handleDrawStroke(pos, e);
        }
    });

    window.addEventListener('mouseup', () => {
        isDrawing = false;
        lastDrawPos = null;
        lastScreenPos = null;
    });

    canvasWorkspace.addEventListener('touchstart', (e) => {
        if (!bgImage || e.touches.length === 0) return;
        isDrawing = true;
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);
        lastDrawPos = pos;
        lastScreenPos = { x: touch.clientX, y: touch.clientY };

        if (currentMode !== 'salmon') {
            saveSalmonEraseUndoState();
            handleDrawStroke(pos, touch);
        }
    }, { passive: false });

    canvasWorkspace.addEventListener('touchmove', (e) => {
        if (!isDrawing || !bgImage || e.touches.length === 0) return;
        e.preventDefault();
        const touch = e.touches[0];
        const pos = getCanvasPos(touch);

        if (currentMode === 'salmon' && lastDrawPos && lastScreenPos) {
            const dx = pos.x - lastDrawPos.x;
            const dy = pos.y - lastDrawPos.y;

            // Screen-space drag delta for resolution-independent rotation sensitivity
            const screenDx = touch.clientX - lastScreenPos.x;
            const screenDy = touch.clientY - lastScreenPos.y;

            if (salmonDragMode === 'move') {
                salmonState.x += dx;
                salmonState.y += dy;
            } else if (salmonDragMode === 'rotate') {
                salmonState.rotY += screenDx * 0.6;
                salmonState.rotX = Math.max(-85, Math.min(85, salmonState.rotX + screenDy * 0.4));
            }

            lastDrawPos = pos;
            lastScreenPos = { x: touch.clientX, y: touch.clientY };
            renderAll();
        } else {
            handleDrawStroke(pos, touch);
        }
    }, { passive: false });

    canvasWorkspace.addEventListener('touchend', () => {
        isDrawing = false;
        lastDrawPos = null;
        lastScreenPos = null;
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
        if (currentMode === 'salmon') {
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
    }

    // --- Salmon Eraser / Hand Punch-Through Logic ---
    function handleDrawStroke(pos, e) {
        if (currentMode === 'salmon') {
            if (lastDrawPos && lastScreenPos && e) {
                const dx = pos.x - lastDrawPos.x;
                const dy = pos.y - lastDrawPos.y;

                // Screen-space drag delta for resolution-independent rotation sensitivity
                const screenDx = e.clientX - lastScreenPos.x;
                const screenDy = e.clientY - lastScreenPos.y;

                if (salmonDragMode === 'move') {
                    salmonState.x += dx;
                    salmonState.y += dy;
                } else if (salmonDragMode === 'rotate') {
                    salmonState.rotY += screenDx * 0.6;
                    salmonState.rotX = Math.max(-85, Math.min(85, salmonState.rotX + screenDy * 0.4));
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

        if (currentTool === 'erase') {
            salmonEraseCtx.fillStyle = '#ffffff';
            salmonEraseCtx.beginPath();
            salmonEraseCtx.arc(pos.x, pos.y, actualBrushSize / 2, 0, Math.PI * 2);
            salmonEraseCtx.fill();

            // Spawn subtle bonito flake shaving particles (鰹の削り節)
            spawnBonitoFlakes(pos.x, pos.y, actualBrushSize);
        } else if (currentTool === 'restore') {
            salmonEraseCtx.save();
            salmonEraseCtx.globalCompositeOperation = 'destination-out';
            salmonEraseCtx.beginPath();
            salmonEraseCtx.arc(pos.x, pos.y, actualBrushSize / 2, 0, Math.PI * 2);
            salmonEraseCtx.fill();
            salmonEraseCtx.restore();
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
        showToast('削りを全消去しました');
    }

    // --- Master Render Pipeline ---
    function renderAll(forExport = false) {
        if (!bgImage) return;

        // 1. Draw Base Background Image
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainCtx.drawImage(bgImage, 0, 0);

        // 2. Render 3D Salmon to Three.js Canvas
        renderThreeSalmon();

        // 3. Composite 3D Salmon onto Main Canvas with Punch-through Eraser Mask
        if (isSalmonLoaded && threeCanvas && activeSalmonGroup) {
            const salmonWidth = threeCanvas.width;
            const salmonHeight = threeCanvas.height;

            const posX = salmonState.x - salmonWidth / 2;
            const posY = salmonState.y - salmonHeight / 2;

            const tempSalmonCanvas = document.createElement('canvas');
            tempSalmonCanvas.width = mainCanvas.width;
            tempSalmonCanvas.height = mainCanvas.height;
            const tCtx = tempSalmonCanvas.getContext('2d');

            tCtx.drawImage(threeCanvas, posX, posY);

            if (salmonEraseCanvas.width > 0) {
                tCtx.globalCompositeOperation = 'destination-out';
                tCtx.drawImage(salmonEraseCanvas, 0, 0);
            }

            // Render fish translucent (55% opacity) during trimming mode so user can see hand/fingers underneath!
            // During export generation or 'salmon' mode, fish is rendered at 100% full opacity.
            if (!forExport && currentMode === 'eraseSalmon') {
                mainCtx.save();
                mainCtx.globalAlpha = 0.55;
                mainCtx.drawImage(tempSalmonCanvas, 0, 0);
                mainCtx.restore();
            } else {
                mainCtx.drawImage(tempSalmonCanvas, 0, 0);
            }
        }

        if (!forExport) {
            renderOverlay();
        }
    }

    function renderThreeSalmon() {
        if (!activeSalmonGroup || !isSalmonLoaded) return;

        const diag = Math.sqrt(salmonAspect * salmonAspect + 1.0);
        const cameraBound = diag * 1.15;

        // Calculate dynamic square canvas render resolution so 360-degree rotation never clips
        const size = Math.round(512 * salmonState.scale * (cameraBound / 1.15));

        if (threeCanvas.width !== size || threeCanvas.height !== size) {
            threeCanvas.width = size;
            threeCanvas.height = size;
            threeRenderer.setSize(size, size);
        }

        const radX = (salmonState.rotX * Math.PI) / 180;
        const radY = (salmonState.rotY * Math.PI) / 180;
        const radZ = (salmonState.rotZ * Math.PI) / 180;

        activeSalmonGroup.rotation.set(radX, radY, radZ);

        threeRenderer.render(threeScene, threeCamera);
    }

    function renderOverlay() {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (!bgImage || currentMode === 'salmon') return;

        // 1. Render Red Translucent Mask Highlight
        if (salmonEraseCanvas.width > 0) {
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

        // 2. Render Transient Bonito Flake Shaving Particles (Overlay only, excluded from output PNG!)
        if (bonitoParticles.length > 0) {
            bonitoParticles.forEach(p => drawBonitoFlake(overlayCtx, p));
        }
    }

    // --- Toast Notification Helper (Exact match with uma-new-era-title) ---
    let toastTimeout;
    function showToast(msg, duration = 2500) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
    }

    // --- Export & Download & Share ---
    generateBtn.addEventListener('click', () => {
        if (!bgImage) {
            showToast('背景画像が読み込まれていません。');
            return;
        }
        renderAll(true); // Render for export (100% fish opacity, no overlays/particles)
        const dataUrl = mainCanvas.toDataURL('image/png');
        resultImage.src = dataUrl;
        downloadBtn.href = dataUrl;

        // Re-render UI state after capturing export
        renderAll(false);

        // Construct Twitter/X Share intent URL matching uma-new-era-title
        const fishName = FISH_CONFIGS[currentFishType].name;
        const tweetText = encodeURIComponent(`${fishName}を召喚しました！\n#ウマ娘 #なんでもサーモンサモナー\n`);
        const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(location.href)}`;
        if (twitterShareBtn) {
            twitterShareBtn.href = tweetUrl;
        }

        resultModal.classList.add('open');
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
