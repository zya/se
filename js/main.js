//--------------------- audio global vars ----------------------//
window.AudioContext = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext);
var webgl = webgl_detect();
var context = new AudioContext();
if(context !== 'undefined'){
    setUpAudio();
}
var frequencyData;
var isloaded = false;
var isPlaying = false;
var analyser, filter, gain;
var audioElements = [];
var audioBuffers = [];
var sourceNodes = [];
var startTime = 0;
var currentAudio = null;
var currentAudioIndex = 0;
function setUpAudio(){
    analyser = context.createAnalyser();
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    gain = context.createGain();
    gain.connect(context.destination);
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.7;
    filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    filter.connect(analyser);
    analyser.connect(context.destination);
}


//--------------------- three global vars ----------------------//
var renderer, scene, camera, controls;
var mesh = new THREE.Mesh(), geometry, material;
var vertices =[], originalvertices = [];
var textures = [];
var offset1, offset2, offset3;
var ambient = 0x000000, 
	diffuse = 0x000000, 
	specular = 0x000000, 
	shininess = 0.0,
	scale = 60;
var uniforms;
var vs, fs;
var texture1, texture2, texture3, texture4;
var canvas;
var previous = 0;
var beat = 0;
var threshold = 60;

//--------------------- helper methods ----------------------//
var map = function(value, istart, istop, ostart, ostop) {
	return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
};
function webgl_detect(return_context) {
    if (!!window.WebGLRenderingContext) {
        var canvas = document.createElement("canvas"),
            names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"],
            context = false;
        for(var i=0;i<4;i++) {
            try {
                context = canvas.getContext(names[i]);
                if (context && typeof context.getParameter == "function") {
                    // WebGL is enabled
                    if (return_context) {
                        // return WebGL object if the function's argument is present
                        return {name:names[i], gl:context};
                    }
                    // else, return just true
                    return true;
                }
            } catch(e) {}
        }
        // WebGL is supported, but disabled
        return false;
    }
    // WebGL not supported
    return false;
}

var mylatesttap;
function doubletap() {
    var now = new Date().getTime();
    var timesince = now - mylatesttap;
    if((timesince < 400) && (timesince > 0)){
        changeRandomTexture();
    }
    mylatesttap = new Date().getTime();
}
//--------------------- setup ----------------------//
function setup() {

    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'main');
    document.getElementById('full').appendChild(canvas);
    var options;
    if (bowser.ios || bowser.android) {
        options = {
            preserveDrawingBuffer: false,
            canvas: canvas,
            antialias: false
        };

        //for mobile use smaller analysis
        analyser.fftSize = 1024;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);

    } else {
        options = {
            preserveDrawingBuffer: true,
            canvas: canvas,
            antialias: true
        };
    }
    renderer = new THREE.WebGLRenderer(options);
    renderer.setClearColor(new THREE.Color('black'), 1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.00001, 8000);
	camera.position.z = 600;

	controls = new THREE.OrbitControls(camera);
	controls.minDistance = 200;
	controls.maxDistance = 900;
	controls.noKeys = true;
	controls.maxPolarAngle = 2.2;
	controls.minPolarAngle = 0.8;
	controls.maxAzimuthAngle = 0.9;
	controls.minAzimuthAngle = -0.9;
	controls.noPan = true;
	controls.autoRotate = false;
	controls.autoRotateSpeed = 0.25;
	controls.zoomSpeed = 0.15;
    if(bowser.ios || bowser.android){
        controls.zoomSpeed = 0.4;
    }
	controls.rotateUp(-0.2);
	controls.rotateLeft(-0.05);

	geometry = new THREE.PlaneBufferGeometry(200,200,90,90);
    geometry.dynamic = true;
	geometry.computeTangents();

	var manager = new THREE.LoadingManager();
	var loader = new THREE.XHRLoader(manager);

	loader.load('shaders/vs.glsl', function(e){
		vs = e;
	});

	loader.load('shaders/fs.glsl', function(e){
		fs = e;
	});


	texture1 = new THREE.ImageUtils.loadTexture('images/32.png');
    texture2 = new THREE.ImageUtils.loadTexture('images/senoghte.png');
    texture3 = new THREE.ImageUtils.loadTexture('images/sedand.png');
    texture4 = new THREE.ImageUtils.loadTexture('images/saboon.png');
    textures.push(texture1,texture2,texture3,texture4);

    var shader = THREE.ShaderLib.normalmap;
	uniforms = THREE.UniformsUtils.clone(shader.uniforms);
	uniforms[ "enableDisplacement" ].value = true;
    uniforms[ "enableDiffuse" ].value = 0;
    uniforms[ "tDiffuse" ].value = texture1;
    uniforms[ "tDiffuseOpacity" ] = { type: 'f', value: 1.0 };
    uniforms[ "tDisplacement" ] = { type: 't', value: texture1};
    uniforms[ "uDisplacementScale" ].value = 100;
    uniforms[ "ambientLightColor" ].value = new THREE.Color( ambient );
    uniforms[ "uDisplacementPostScale" ] = {type: 'f', value: scale };
    uniforms[ "diffuse" ].value = new THREE.Color( diffuse );
    uniforms[ "specular" ].value = new THREE.Color( specular );
    uniforms[ "ambient" ].value = new THREE.Color( ambient );
    uniforms[ "shininess" ].value = shininess;

	manager.onLoad = function(){
		material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs,
            side: THREE.DoubleSide,
            wireframe: true
    	});
		mesh = new THREE.Mesh(geometry, material);

        vertices = mesh.geometry.getAttribute("position").array;
        for(var i = 0; i < vertices.length; i++){
            originalvertices.push(vertices[i]);
        }

        offset1 = Math.ceil(vertices.length / 8);
        offset2 = Math.ceil(vertices.length / 1.9);
        offset3 = Math.ceil(vertices.length / 2.5);

        isloaded = true;
		scene.add(mesh);
        var element = document.getElementById('spinner');
        document.body.removeChild(element);
        document.getElementById('full').style.visibility = 'visible';
	};
}
//--------------------- drawing methods ----------------------//
function analyseAudio(){
	analyser.getByteFrequencyData(frequencyData);
}

function autoRotate(){
    var time = Date.now();
    var value = Math.sin(time * 0.00009) * 0.4;
    mesh.rotation.y = value;
}

function updateVertices(){

	if(isloaded) {
        var sum = 0;
        for(var i = 0; i < frequencyData.length; i++){
            sum += frequencyData[i];
            var index = Math.ceil(map(i, 0, frequencyData.length, 0, vertices.length));
            var value = map(frequencyData[i], 0, 256, 1, 1.3);
            vertices[index + offset1 + 200] = originalvertices[index + offset1 + 200] * value;
            vertices[index + offset2 + 200] = originalvertices[index + offset2 + 200] * value;
            vertices[index + offset3] = originalvertices[index + offset3] * value;
        }
        var average = sum/frequencyData.length;
        beat++;
        if( average > 20) {
            scale = average + 20;
            if(beat % 150 === 0){
                changeRandomTexture();
                if(!bowser.ios || !bowser.android){
                    if(scale > 50){
                        renderer.autoClear = false;
                        setTimeout(function(){
                            renderer.autoClear = true;
                        },1300);
                    }
                }

            }
            if(scale > threshold){
                beat++;
            }
        }
        geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

    }
}

function change(texture){
    uniforms.tDisplacement.value = texture;
    uniforms.tDiffuse.value = texture;
}

function screenshot(){
    var link = document.getElementById('screen');
    renderer.render(scene, camera);
    var img = renderer.domElement.toDataURL('image/jpeg');
    link.href = img;
    link.target = "_blank";
    link.download = "Mez'Rab - 3.jpg";
    link.click();
}
//--------------------- event listeners ----------------------//
function setupListeners(){
    var link = document.createElement('a');
    link.id = "screen";
    document.body.appendChild(link);

    window.addEventListener('resize', function(){
        s = window.innerHeight > window.innerWidth ? window.innerWidth : window.innerHeight;
		renderer.setSize( window.innerWidth, window.innerHeight);
		camera.aspect	= window.innerWidth /  window.innerHeight;
		camera.updateProjectionMatrix();	
	}, false);

    document.getElementById('main').addEventListener('dblclick',changeRandomTexture, false);

    if (!bowser.ios) {
        document.getElementById('fullscreen').addEventListener('click', function(){
            if(bowser.firefox){
                var element = document.getElementById('full');
                element.mozRequestFullScreen();
            } else {
                document.getElementById('full').webkitRequestFullscreen();
            }
        }, false);
    }

    document.getElementById('screenshot').addEventListener('click', screenshot, false);

    document.getElementById('hide').addEventListener('click', function(){
        document.getElementById('controls').style.display = 'none';
        document.getElementById('name').style.display = 'none';
        document.getElementById('show').style.display = 'block';
    }, false);

    document.getElementById('show').addEventListener('click', function(){
        document.getElementById('controls').style.display = 'block';
        document.getElementById('name').style.display = 'block';
        document.getElementById('show').style.display = 'none';
    }, false);

    document.getElementById('question').addEventListener('click', function(){
        var display = document.getElementById('help').style.display;
        if(display === 'block'){
            document.getElementById('help').style.display = 'none';
        }else{
            document.getElementById('help').style.display = 'block';
        }
    }, false);

    var z = 0;
    document.getElementById('main').addEventListener('touchstart', function(){
        if(z === 0){
            console.log('osc');
            var osc = context.createOscillator();
            osc.connect(context.destination);
            osc.start(0);
            osc.stop(0);
            z = 1;
        }
    }, false);
    document.getElementById('main').addEventListener('touchstart', function(){
        doubletap();
    }, false);
    if(bowser.firefox || bowser.ios){
        document.getElementById('play').className = 'fa fa-volume-off icon';
    }
    document.getElementById('play').addEventListener('click', function(){
        if(isPlaying){
            if(bowser.firefox || bowser.ios){
                this.className = 'fa fa-volume-off icon';
                gain.gain.value = 0.0;
            } else {
                currentAudio.pause();
                this.className = "fa fa-play icon";
            }
            isPlaying = false;
        }else{
            if(bowser.firefox || bowser.ios) {
                gain.gain.value = 1;
                document.getElementById('soundcloud').style.visibility = 'hidden';
                this.className = 'fa fa-volume-up icon';
            } else {
                document.getElementById('soundcloud').style.visibility = 'hidden';
                currentAudio.play();
                this.className = "fa fa-pause icon";
            }

            isPlaying = true;
        }
    }, false);

    window.addEventListener('keydown', function(e){
        if(e.keyCode === 83){
            screenshot();
        }
    }, false);
}

function changeRandomTexture(){
    var random = generateRandom(previous);
    previous = random;
    change(textures[random]);
}

function generateRandom(prev){
    var randNumber = 0;
    do {
        var num = Math.floor(Math.random() * 4);
        randNumber = num;
    } while (randNumber == prev);
    return randNumber;
}

function loadAudioWebkit(){
    var iter = 0;
    var senoghte = new Audio();
    senoghte.src = "audio/01.mp3";
    senoghte.load();
    var sedandeh = new Audio();
    sedandeh.src = "audio/02.mp3";
    sedandeh.load();
    var saboon = new Audio();
    saboon.src = "audio/03.mp3";
    saboon.load();
    audioElements.push(senoghte, sedandeh, saboon);

    for(var i=0 ; i < audioElements.length; i++){
        audioElements[i].addEventListener('canplaythrough', function(){
            iter++;
            if(iter === 3){
                console.log('Audio Files Can Play Through');
                document.getElementById('loadingaudio').style.visibility = 'hidden';
                document.getElementById('audiospin').style.visibility = 'hidden';
                document.getElementById('audiospin').className = 'fa fa-spinner fa-spin';
                document.getElementById('play').className = "fa fa-pause icon";
                playaudioelement(audioElements[0]);
                sedandeh.load();
                isPlaying = true;
                audioElements[0].addEventListener('ended', function(){
                    playaudioelement(audioElements[1]);
                    saboon.load();
                },false);
                audioElements[1].addEventListener('ended', function(){
                    saboon.load();
                    playaudioelement(audioElements[2]);
                    senoghte.load();
                },false);
                audioElements[2].addEventListener('ended', function(){
                    isPlaying = false;
                    document.getElementById('soundcloud').style.visibility = 'visible';
                    console.log(document.getElementById('play').className);
                    document.getElementById('play').className = "fa fa-play icon";
                    console.log(document.getElementById('play').className);
                    currentAudio = audioElements[0];
                },false);
            }
        });
    }
}

function loadAudioOther(){
    var manager = new THREE.LoadingManager();
    var loader = new THREE.XHRLoader();
    loader.setResponseType("arraybuffer");
    loader.load("audio/01.mp3", function(response){
        context.decodeAudioData(response, function(buffer){
            audioBuffers.push(buffer);
            var source = context.createBufferSource();
            sourceNodes.push(source);
            source.buffer = buffer;
            source.connect(filter);
            source.connect(gain);
            source.start(0);
            startTime = context.currentTime;
            isPlaying = true;
            currentAudio = sourceNodes[0];
            currentAudioIndex = 0;

            source.onended = function(){
                isPlaying = true;
                if(!bowser.ios){
                    sourceNodes[1].start(0);
                    startTime = context.currentTime;
                    currentAudio = sourceNodes[1];
                    currentAudioIndex = 1;
                }
            };
            document.getElementById('loadingaudio').style.visibility = 'hidden';
            document.getElementById('audiospin').style.visibility = 'hidden';
            document.getElementById('play').className = "fa fa-pause icon";
            if(bowser.firefox || bowser.ios) {
                document.getElementById('play').className = "fa fa-volume-up icon";
            }
            //load the second
            if(!bowser.ios){
                loader.load("audio/02.mp3", function(response){
                    context.decodeAudioData(response, function(buffer){
                        audioBuffers.push(buffer);
                        var source = context.createBufferSource();
                        sourceNodes.push(source);
                        source.buffer = buffer;
                        source.connect(filter);
                        source.connect(gain);
                        source.onended = function(){
                            isPlaying = true;
                            startTime = context.currentTime;
                            sourceNodes[2].start(0);
                            currentAudio = sourceNodes[2];
                            currentAudioIndex = 2;
                        };

                        //load the thrid one
                        loader.load("audio/03.mp3", function(response){
                            context.decodeAudioData(response, function(buffer){
                                audioBuffers.push(buffer);
                                var source = context.createBufferSource();
                                sourceNodes.push(source);
                                source.buffer = buffer;
                                source.connect(filter);
                                source.connect(gain);
                                source.onended = function(){
                                    isPlaying = false;
                                    document.getElementById('soundcloud').style.visibility = 'visible';
                                    document.getElementById('soundcloud').style['z-index'] = 1000;
                                };
                            });
                        });
                    });
                });
            }
        });
    });
}


function playaudioelement(audio){
    var source = context.createMediaElementSource(audio);
    source.connect(filter);
    source.connect(context.destination);
    audio.play();
    currentAudio = audio;
}

//--------------------- draw ----------------------//
function draw() {
	analyseAudio();
	isPlaying ? updateVertices() : false;
	controls.update();
    autoRotate();
	uniforms[ "uDisplacementPostScale" ].value = scale;
    renderer.render(scene, camera);
    requestAnimationFrame(draw);
}

window.onload = function() {

    if (webgl && context !== 'undefined') {
        if(bowser.webkit){
            if (bowser.ios) {
                var parent = document.getElementById('controls');
                var element = document.getElementById('fullscreen');
                parent.removeChild(element);
                loadAudioOther();
            } else {
                setTimeout(function(){
                  document.getElementById('soundcloud').style['z-index'] = -2000;  
                }, 100);
                loadAudioWebkit();
            }
        } else if (bowser.firefox) {
            loadAudioOther();
        }
        setup();
        setupListeners();
        draw();
    } else {
        document.getElementById('soundcloud').style.visibility = 'visible';
        document.getElementById('soundcloud').style['z-index'] = 1000;
        document.getElementById('notsupported').style.visibility = 'visible';
    }
};