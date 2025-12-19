import { createIcons, icons } from 'lucide';
import './css/style.css'; 
import './js/api.js'; // Importamos la lógica de búsqueda por cédula

// ==========================================
// 1. INICIALIZACIÓN (SE EJECUTA AL CARGAR)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Renderizar iconos iniciales
    createIcons({ icons });
    
    // Iniciar el observador de scroll (animaciones)
    iniciarAnimacionesScroll();
    
    // Iniciar escuchador del Navbar (sombra)
    window.addEventListener('scroll', handleNavbarShadow);
});

// ==========================================
// 2. LÓGICA DEL MENÚ MÓVIL
// ==========================================
let isMenuOpen = false;

window.toggleMenu = function() {
    const menu = document.getElementById('mobile-menu');
    const iconHamburger = document.getElementById('icon-hamburger');
    const iconClose = document.getElementById('icon-close');
    const body = document.body;

    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
        // ABRIR MENÚ
        menu.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
        menu.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
        body.classList.add('overflow-hidden'); // Bloquear scroll fondo
        
        // Cambiar iconos (Mostrar X)
        if(iconHamburger && iconClose) {
            iconHamburger.classList.add('hidden');
            iconClose.classList.remove('hidden');
        }

    } else {
        // CERRAR MENÚ
        menu.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
        menu.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
        body.classList.remove('overflow-hidden'); // Permitir scroll
        
        // Cambiar iconos (Mostrar Hamburguesa)
        if(iconHamburger && iconClose) {
            iconHamburger.classList.remove('hidden');
            iconClose.classList.add('hidden');
        }
    }
};

window.closeMenu = function() {
    if (isMenuOpen) window.toggleMenu();
};

// ==========================================
// 3. LÓGICA DEL MODAL (ZONA CLIENTES)
// ==========================================
window.toggleModal = function() {
    const modal = document.getElementById('clientModal');
    const body = document.body;

    // Verificar si el modal existe antes de intentar abrirlo
    if (!modal) return;

    if (modal.classList.contains('open')) {
        // CERRAR
        modal.classList.remove('open');
        body.classList.remove('overflow-hidden');
        
        // Limpieza visual retardada
        setTimeout(() => {
            const resultArea = document.getElementById('resultArea');
            if(resultArea) resultArea.classList.add('hidden');
            
            const form = document.getElementById('clientForm');
            if(form) form.reset();
            
            // Si hubiera lista de sugerencias (ya no usada, pero por si acaso)
            const suggestions = document.getElementById('suggestions-list');
            if(suggestions) suggestions.classList.add('hidden');
        }, 300);

    } else {
        // ABRIR
        modal.classList.add('open');
        body.classList.add('overflow-hidden');
        
        // Enfocar input solo en PC
        setTimeout(() => {
            const input = document.getElementById('cedula') || document.getElementById('search-input');
            if(input && window.innerWidth > 768) input.focus();
        }, 100);
    }
};

// ==========================================
// 4. LÓGICA DEL MODAL LEGAL (TÉRMINOS)
// ==========================================
window.openLegalModal = function() {
    const modal = document.getElementById('legalModal');
    const body = document.body;
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        body.classList.add('overflow-hidden'); // Bloquear scroll
    }
};

window.closeLegalModal = function() {
    const modal = document.getElementById('legalModal');
    const body = document.body;
    if (modal) {
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');
        body.classList.remove('overflow-hidden'); // Restaurar scroll
    }
};

// ==========================================
// 5. LÓGICA DE WHATSAPP Y NAVEGACIÓN
// ==========================================
window.scrollToSection = function(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Si el menú móvil estaba abierto, cerrarlo
        if (isMenuOpen) window.toggleMenu();
    }
};

window.redirigirWhatsapp = function(mensajeOpcional) {
    const numero = "593982246998"; 
    let mensaje = "Hola Alfatel, estoy visitando su web y quisiera más información.";

    if (mensajeOpcional) {
        if (mensajeOpcional === 'Soporte Técnico') {
            mensaje = "Hola Alfatel, soy cliente y necesito ayuda con mi servicio.";
        } else if (mensajeOpcional === 'Actualizar Datos') {
             mensaje = "Hola Alfatel, quiero actualizar mis datos de cliente (Cédula no registrada).";
        } else {
            mensaje = mensajeOpcional;
        }
    }
    
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
};

window.contratarPlan = function(nombrePlan) {
    const mensaje = `Hola Alfatel, me interesa contratar el plan: ${nombrePlan}. ¿Me ayudan con los requisitos?`;
    window.redirigirWhatsapp(mensaje);
};

// ==========================================
// 6. FUNCIONES VISUALES (SCROLL & SHADOW)
// ==========================================
function iniciarAnimacionesScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function handleNavbarShadow() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 20) navbar.classList.add('shadow-md');
        else navbar.classList.remove('shadow-md');
    }
}