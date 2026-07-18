// Initialize Lucide Icons
lucide.createIcons();

// --- THREE.JS INTERACTIVE 3D LATTICE BACKGROUND ---
let scene, camera, renderer, particleGroup;
let particles = [];
const particleCount = 100;
const maxDistance = 6.5;
const maxLines = 250;

let lineGeometry, linePositions, lineSegments;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

function init3D() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // Scene & Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 28;

  // Group to contain all 3D lattice items
  particleGroup = new THREE.Group();
  scene.add(particleGroup);

  // Custom circular glowing texture for points (representing glassy carbon carbon atoms)
  const particleTexture = createCircleTexture();

  // Particle positions & velocities setup
  const positions = new Float32Array(particleCount * 3);
  const particleGeometry = new THREE.BufferGeometry();

  for (let i = 0; i < particleCount; i++) {
    const x = (Math.random() - 0.5) * 35;
    const y = (Math.random() - 0.5) * 35;
    const z = (Math.random() - 0.5) * 35;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    particles.push({
      x: x, y: y, z: z,
      vx: (Math.random() - 0.5) * 0.03,
      vy: (Math.random() - 0.5) * 0.03,
      vz: (Math.random() - 0.5) * 0.03
    });
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Point cloud material using the canvas texture
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x38bdf8, // Sky Blue base
    size: 0.9,
    map: particleTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  const pointCloud = new THREE.Points(particleGeometry, particleMaterial);
  particleGroup.add(pointCloud);

  // Set up Line segments to draw the lattice connections (covalent bonds)
  linePositions = new Float32Array(maxLines * 6); // 2 points per line * 3 coordinates
  lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x2dd4bf, // Peacock Teal light glow
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
  particleGroup.add(lineSegments);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Listeners
  document.addEventListener('mousemove', onMouseMove, false);
  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('scroll', onScrollInteraction, false);

  animate();
}

// Generate circular glow on the fly to avoid external assets
function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(56, 189, 248, 1)'); // Sky Blue
  gradient.addColorStop(0.5, 'rgba(13, 148, 136, 0.6)'); // Peacock Teal
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  return new THREE.CanvasTexture(canvas);
}

function onMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) * 0.05;
  mouseY = (event.clientY - windowHalfY) * 0.05;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// As the user scrolls down, spread/morph the lattice structure
function onScrollInteraction() {
  const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
  // Expand/contract group size based on scroll position
  if (particleGroup) {
    particleGroup.scale.set(1 + scrollPct * 0.3, 1 + scrollPct * 0.3, 1 + scrollPct * 0.3);
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Slow particle drift physics
  const positions = particleGroup.children[0].geometry.attributes.position.array;
  
  let lineCount = 0;
  
  for (let i = 0; i < particleCount; i++) {
    const p = particles[i];
    
    // Update positions
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;
    
    // Boundary bounce
    const limit = 18;
    if (p.x < -limit || p.x > limit) p.vx *= -1;
    if (p.y < -limit || p.y > limit) p.vy *= -1;
    if (p.z < -limit || p.z > limit) p.vz *= -1;
    
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
  
  particleGroup.children[0].geometry.attributes.position.needsUpdate = true;

  // Build the network lines
  for (let i = 0; i < particleCount; i++) {
    for (let j = i + 1; j < particleCount; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dz = particles[i].z - particles[j].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (dist < maxDistance && lineCount < maxLines) {
        linePositions[lineCount * 6] = particles[i].x;
        linePositions[lineCount * 6 + 1] = particles[i].y;
        linePositions[lineCount * 6 + 2] = particles[i].z;
        linePositions[lineCount * 6 + 3] = particles[j].x;
        linePositions[lineCount * 6 + 4] = particles[j].y;
        linePositions[lineCount * 6 + 5] = particles[j].z;
        lineCount++;
      }
    }
  }

  // Reset trailing lines in buffer
  for (let k = lineCount; k < maxLines; k++) {
    linePositions[k * 6] = 0;
    linePositions[k * 6 + 1] = 0;
    linePositions[k * 6 + 2] = 0;
    linePositions[k * 6 + 3] = 0;
    linePositions[k * 6 + 4] = 0;
    linePositions[k * 6 + 5] = 0;
  }
  
  lineGeometry.attributes.position.needsUpdate = true;

  // Smooth mouse rotation interaction (lerp)
  targetX += (mouseX - targetX) * 0.05;
  targetY += (mouseY - targetY) * 0.05;

  particleGroup.rotation.y = targetX * 0.005;
  particleGroup.rotation.x = targetY * 0.005;

  // Constant rotation drift
  particleGroup.rotation.z += 0.001;

  renderer.render(scene, camera);
}

// Start Three.js background once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  init3D();
});


// --- DOM INTERACTIVES (HEADER SCROLL, TABS, FILTERS, PROGRESS BARS) ---

// Header Background Scroll Effect
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Mobile Hamburger Toggle
const hamburger = document.getElementById('hamburger-toggle');
const navMenu = document.getElementById('nav-menu');

hamburger.addEventListener('click', () => {
  navMenu.classList.toggle('active');
  // Animate hamburger to X
  const spans = hamburger.querySelectorAll('span');
  spans[0].style.transform = navMenu.classList.contains('active') ? 'rotate(45deg) translate(5px, 5px)' : 'none';
  spans[1].style.opacity = navMenu.classList.contains('active') ? '0' : '1';
  spans[2].style.transform = navMenu.classList.contains('active') ? 'rotate(-45deg) translate(6px, -6px)' : 'none';
});

// Close nav menu on clicking links (mobile)
navMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
    const spans = hamburger.querySelectorAll('span');
    spans[0].style.transform = 'none';
    spans[1].style.opacity = '1';
    spans[2].style.transform = 'none';
  });
});

// Active Link Highlight on Scroll
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('nav a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= (sectionTop - 200)) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href').slice(1) === current) {
      a.classList.add('active');
    }
  });
});

// Publications Switch Tabs
function switchTab(evt, tabName) {
  const tabcontents = document.getElementsByClassName('tab-content');
  for (let i = 0; i < tabcontents.length; i++) {
    tabcontents[i].classList.remove('active');
  }

  const tablinks = document.getElementsByClassName('tab-btn');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active');
  }

  document.getElementById(tabName).classList.add('active');
  evt.currentTarget.classList.add('active');
}

// Projects Showcase Filter
function filterProjects(category) {
  const pCards = document.querySelectorAll('.project-card');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // Update active button
  filterBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick').includes(category)) {
      btn.classList.add('active');
    }
  });

  // Filter cards
  pCards.forEach(card => {
    const cat = card.getAttribute('data-cat');
    if (category === 'all' || cat === category) {
      card.style.display = 'flex';
      card.style.animation = 'fadeIn 0.5s ease forwards';
    } else {
      card.style.display = 'none';
    }
  });
}

// Skills section animation on entrance
const skillsSection = document.getElementById('skills');
const progressBars = document.querySelectorAll('.skill-bar-fill');

const skillsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      progressBars.forEach(bar => {
        const width = bar.getAttribute('data-width');
        bar.style.width = width;
      });
      // Unobserve once animation is triggered
      skillsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

if (skillsSection) {
  skillsObserver.observe(skillsSection);
}

// Form Submission handling (Mock Integration)
function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const statusMsg = document.getElementById('form-status-msg');
  const submitBtn = form.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Sending... <i data-lucide="loader" class="animate-spin"></i>';
  lucide.createIcons();

  // Mock server roundtrip
  setTimeout(() => {
    form.reset();
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Send Message <i data-lucide="send"></i>';
    lucide.createIcons();
    
    statusMsg.classList.add('success');
    statusMsg.innerText = 'Thank you! Your message has been sent successfully. Dr. Anto Manuel will get back to you shortly.';
    
    // Hide status after 5s
    setTimeout(() => {
      statusMsg.style.display = 'none';
      statusMsg.classList.remove('success');
    }, 6000);
  }, 1200);
}
