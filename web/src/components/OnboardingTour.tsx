'use client';
 
import { useEffect, useRef } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';
 
// Estilos customizados para garantir que o tour seja premium e nÃ£o seja cortado
const tourStyles = `
  .introjs-tooltip {
    border-radius: 20px !important;
    padding: 20px !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    border: 1px solid rgba(226, 232, 240, 0.8) !important;
    min-width: 320px !important;
  }
  .introjs-tooltip-title {
    font-weight: 900 !important;
    color: #0f172a !important;
    font-size: 1.1rem !important;
    margin-bottom: 10px !important;
  }
  .introjs-tooltiptext {
    color: #475569 !important;
    font-size: 0.95rem !important;
    line-height: 1.6 !important;
  }
  .introjs-arrow {
    border-bottom-color: white !important;
  }
  .introjs-button {
    border-radius: 12px !important;
    padding: 10px 20px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    font-size: 0.75rem !important;
    transition: all 0.2s !important;
    border: none !important;
    text-shadow: none !important;
  }
  .introjs-nextbutton {
    background: #2563eb !important;
    color: white !important;
  }
  .introjs-prevbutton {
    background: #f1f5f9 !important;
    color: #64748b !important;
  }
  .introjs-donebutton {
    background: #059669 !important;
    color: white !important;
  }
  .introjs-bullets ul li a {
    background: #cbd5e1 !important;
  }
  .introjs-bullets ul li a.active {
    background: #2563eb !important;
  }
  .introjs-progress {
    height: 6px !important;
    border-radius: 10px !important;
    background-color: #f1f5f9 !important;
  }
  .introjs-progressbar {
    background-color: #2563eb !important;
    border-radius: 10px !important;
  }
`;
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
 
export default function OnboardingTour() {
  const { user, syncUser } = useAuth();
  const tourRef = useRef<boolean>(false);
 
  useEffect(() => {
    // Injetar estilos
    const styleElement = document.createElement('style');
    styleElement.innerHTML = tourStyles;
    document.head.appendChild(styleElement);
 
    if (!user || user.has_seen_tour || user.terms_pending || tourRef.current) return;
 
    const startTour = async () => {
      tourRef.current = true;
 
      const intro = introJs();
 
      const allSteps = [
        {
          title: 'Bem-vindo ao Aluga Fácil! 👋',
          intro: 'Estamos muito felizes em ter você aqui. Vamos te mostrar os primeiros passos para gerenciar seus imóveis como um profissional.',
        },
        {
          element: '#tour-nav-dashboard',
          title: 'Visão Geral 📊',
          intro: 'Aqui você tem o controle total do seu negócio em uma única tela.',
          position: 'right'
        },
        {
          element: '#tour-nav-properties',
          title: 'Seus Imóveis 🏠',
          intro: 'Cadastre e gerencie suas propriedades, fotos e preços aqui.',
          position: 'right'
        },
        {
          element: '#tour-nav-tenants',
          title: 'Locatários 👥',
          intro: 'Mantenha o cadastro completo dos seus clientes sempre à mão.',
          position: 'right'
        },
        {
          element: '#tour-nav-reservations',
          title: 'Agenda de Reservas 📅',
          intro: 'Visualize sua ocupação e gerencie as datas de entrada e saída.',
          position: 'right'
        },
        {
          element: '#tour-nav-payments',
          title: 'Financeiro 💰',
          intro: 'Controle todos os pagamentos e recebimentos das suas locações.',
          position: 'right'
        },
        {
          element: '#tour-nav-contracts',
          title: 'Contratos 📄',
          intro: 'Gere e acompanhe seus contratos de locação de forma automática.',
          position: 'right'
        },
        {
          element: '#tour-nav-plans',
          title: 'Assinatura 💳',
          intro: 'Gerencie seu plano e acompanhe seus benefícios.',
          position: 'right'
        },
        {
          element: '#tour-nav-campaigns',
          title: 'Mala Direta 📣',
          intro: 'Crie campanhas para fidelizar seus clientes (Disponível no Plano Completo).',
          position: 'right'
        },
        {
          element: '#tour-nav-users',
          title: 'Equipe de Usuários 👥',
          intro: 'Gerencie quem pode acessar e ajudar na sua operação (Disponível no Plano Completo).',
          position: 'right'
        },
        {
          element: '#tour-nav-profile',
          title: 'Seu Perfil 👤',
          intro: 'Mantenha seus dados e configurações sempre atualizados.',
          position: 'right'
        },
        {
          element: '#tour-new-reservation',
          title: 'Atalho: Nova Reserva ⚡',
          intro: 'Precisa travar uma data rápido? Use este botão para criar uma reserva manual.',
          position: 'bottom'
        },
        {
          element: '#tour-sync-all',
          title: 'Sincronismo iCal 🔄',
          intro: 'Atualize todas as suas plataformas (Airbnb/Booking) com um único clique.',
          position: 'bottom'
        },
        {
          element: '#tour-stats-revenue',
          title: 'Métricas Reais 📈',
          intro: 'Acompanhe seu faturamento e a saúde financeira do seu negócio.',
          position: 'top'
        },
        {
          element: '#tour-support-button',
          title: 'Suporte VIP 🛟',
          intro: 'Dúvidas ou sugestões? Nossa equipe está a um clique de distância via WhatsApp ou E-mail.',
          position: 'left'
        },
        {
          title: 'Tudo pronto! 🚀',
          intro: 'Agora o controle é seu. Comece cadastrando seu primeiro imóvel e veja a mágica acontecer!',
        }
      ];
 
      // Filtrar passos que sÃ³ existem no Plano Completo se o usuÃ¡rio nÃ£o tiver acesso
      const filteredSteps = allSteps.filter(step => {
        if (user?.plan_name === 'Plano Básico') {
          if (step.element === '#tour-nav-campaigns' || step.element === '#tour-nav-users') {
            return false;
          }
        }
        return true;
      });
 
      intro.setOptions({
        steps: filteredSteps,
        showProgress: true,
        showBullets: true,
        exitOnOverlayClick: false,
        nextLabel: 'Próximo',
        prevLabel: 'Anterior',
        doneLabel: 'VAMOS LÁ!',
        overlayOpacity: 0.8,
        scrollToElement: true,
        helperElementPadding: 20,
        // @ts-ignore - Option exists but missing in @types/intro.js
        skipIfNoElement: true,
        positionPrecedence: ['bottom', 'top', 'right', 'left']
      });
 
      // Sincronia Turbo: Refresh imediato e outro após delay para compensar scroll/render
      intro.onbeforechange(() => {
        intro.refresh(); 
        setTimeout(() => {
          intro.refresh();
        }, 200);
        return true;
      });
 
      intro.oncomplete(async () => {
        try {
          await api.post('/auth/complete-tour');
          await syncUser();
        } catch (error) {
          console.error('Erro ao marcar tour como visto:', error);
        }
      });
 
      intro.onexit(async () => {
         const currentStep = intro.currentStep();
         if (currentStep !== undefined && (currentStep as any) > 1) {
            try {
              await api.post('/auth/complete-tour');
              await syncUser();
            } catch (error) {
              console.error('Erro ao marcar tour como visto no exit:', error);
            }
         }
      });
 
      setTimeout(() => {
        intro.start();
      }, 1000); // Delay para garantir que o layout renderizou
    };
 
    startTour();
  }, [user, syncUser]);
 
  return null;
}
