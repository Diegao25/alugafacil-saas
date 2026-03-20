'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Shield,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Star,
  Zap,
  Clock,
  LayoutDashboard,
  Smartphone,
  Check
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const external = params.get('external');
    if (!loading && user && !external) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const features = [
    {
      icon: Calendar,
      title: 'Agenda Inteligente',
      description: 'Chega de conflitos. Visualize todas as suas reservas em um calendário prático e atualizado em tempo real.'
    },
    {
      icon: DollarSign,
      title: 'Controle Financeiro',
      description: 'Tenha clareza de quanto está ganhando. Acompanhe pagamentos, sinais e pendências sem dor de cabeça.'
    },
    {
      icon: FileText,
      title: 'Contratos em 1 Clique',
      description: 'Gere contratos profissionais em PDF preenchidos automaticamente com os dados do locatário e valores.'
    },
    {
      icon: Users,
      title: 'Gestão de Clientes',
      description: 'Mantenha o histórico e os contatos de todos os seus hóspedes organizados para futuras locações.'
    },
    {
      icon: LayoutDashboard,
      title: 'Dashboard de Resultados',
      description: 'Acompanhe a taxa de ocupação, faturamento mensal e anual através de gráficos intuitivos.'
    },
    {
      icon: Smartphone,
      title: 'Acesso de Qualquer Lugar',
      description: 'Gerencie seus imóveis pelo computador, tablet ou celular, sempre que precisar.'
    }
  ];

  const benefits = [
    {
      title: 'Economize até 15h por semana',
      description: 'Automatize tarefas burocráticas e manuais. Chega de preencher as mesmas planilhas repetidas vezes ou escrever contratos do zero.',
      icon: Clock
    },
    {
      title: 'Zere os erros e reservas duplas',
      description: 'Com tudo centralizado no sistema, a desorganização acaba. Você nunca mais vai alugar o mesmo imóvel para duas pessoas diferentes na mesma data.',
      icon: Shield
    },
    {
      title: 'Paz de espírito com recebimentos',
      description: 'Tenha previsibilidade do seu fluxo de caixa e saiba exatamente quem já pagou, quem deve pagar e quais são os próximos recebimentos.',
      icon: Zap
    }
  ];

  const testimonials = [
    {
      name: 'Roberto Amaral',
      role: 'Dono de 3 casas no litoral',
      text: '"Antes do Aluga Fácil, meus finais de semana eram gastos enviando mensagens e organizando agendas de papel. Hoje, administro tudo em 10 minutos pelo celular."',
      avatar: 'RC'
    },
    {
      name: 'Ana Costa',
      role: 'Gestora Imobiliária',
      text: '"A geração automática de contratos é mágica. O que eu levava 30 minutos para redigir e revisar, agora faço com literalemente um clique. Indispensável!"',
      avatar: 'AC'
    },
    {
      name: 'Carlos Oliveira',
      role: 'Proprietário de Chalés',
      text: '"Acompanhar os pagamentos de sinais e parcelas era um inferno na planilha. O dashboard financeiro mudou o rumo do meu pequeno negócio."',
      avatar: 'CO'
    }
  ];

  const termsSections = [
    {
      title: '1. Aceitação',
      content:
        'Ao utilizar o Aluga Fácil, você concorda com este conjunto de regras, políticas e práticas. O uso contínuo evidencia a aceitação automática dessas condições.'
    },
    {
      title: '2. Uso autorizado',
      content:
        'Você pode criar e gerenciar seus imóveis, reservas e locatários. É proibido usar a plataforma para atividades ilegais, conteúdo enganoso ou violar direitos de terceiros.'
    },
    {
      title: '3. Dados e privacidade',
      content:
        'Os dados cadastrados — clientes, pagamentos, contratos — são armazenados com segurança. É responsabilidade do usuário manter seus acessos protegidos.'
    },
    {
      title: '4. Responsabilidades',
      content:
        'O sistema auxilia na gestão, mas o locador continua responsável por verificar contratos, políticas locais e comunicações com os hóspedes.'
    },
    {
      title: '5. Alterações nos termos',
      content: 'Podemos ajustar estes termos a qualquer momento. Notificaremos por e-mail e o uso contínuo após a comunicação implica aceitação.'
    }
  ];

  const privacySections = [
    {
      title: '1. Dados coletados',
      content:
        'Coletamos apenas informações necessárias para operar a plataforma – nome, CPF/CNPJ, telefone e dados de pagamento. Essas informações são usadas para processar reservas e emitir documentos.'
    },
    {
      title: '2. Compartilhamento',
      content:
        'Compartilhamos dados com parceiros apenas quando estritamente necessário (ex.: Stripe para pagamentos) e nunca vendemos sua base para terceiros.'
    },
    {
      title: '3. Segurança',
      content:
        'Utilizamos criptografia em trânsito e repouso. Recomendamos habilitar autenticação forte e proteger seus tokens de API.'
    },
    {
      title: '4. Cookies',
      content:
        'Usamos cookies essenciais para manter sessões e cookies analíticos para melhorar o produto. Você pode revogar cookies não essenciais via configurações do navegador.'
    },
    {
      title: '5. Contato',
      content:
        'Para acessar ou excluir dados, envie um e-mail para privacidade@alugafacil.com.br. Respondemos em até 7 dias úteis.'
    }
  ];

  const contactInfo = [
    {
      label: 'E-mail',
      value: 'suporte@alugafacil.com.br',
      href: 'mailto:suporte@alugafacil.com.br'
    },
    {
      label: 'WhatsApp',
      value: '+55 (11) 99999-0000',
      href: 'https://wa.me/5511999990000'
    },
    {
      label: 'Telefone',
      value: '+55 (11) 3333-4444',
      href: 'tel:+551133334444'
    }
  ];

  const handleOpenTerms = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsTermsOpen(true);
  };

  const handleOpenPrivacy = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsPrivacyOpen(true);
  };

  const handleOpenContact = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsContactOpen(true);
  };

  return (
    <div className="w-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Header/Navigation */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Logo href="/" size="medium" />

            {/* Desktop Nav */}
            <nav className="hidden md:flex gap-8 font-medium">
              <a href="#como-funciona" className="text-slate-600 hover:text-blue-600 transition">Como Funciona</a>
              <a href="#funcionalidades" className="text-slate-600 hover:text-blue-600 transition">Funcionalidades</a>
              <a href="#beneficios" className="text-slate-600 hover:text-blue-600 transition">Benefícios</a>
              <a href="#depoimentos" className="text-slate-600 hover:text-blue-600 transition">Depoimentos</a>
            </nav>

            <div className="hidden md:flex gap-4 items-center">
              <Link href="/login?external=1" className="text-slate-700 font-semibold hover:text-blue-600 transition">
                Entrar
              </Link>
              <Link href="/register?external=1" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                Criar Conta Grátis
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-6 pt-4 px-2 space-y-6 bg-white border-t border-slate-100 absolute top-full w-full left-0 shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto">
              <div className="flex flex-col px-4">
                <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-lg font-medium text-slate-700 border-b border-slate-100">Como Funciona</a>
                <a href="#funcionalidades" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-lg font-medium text-slate-700 border-b border-slate-100">Funcionalidades</a>
                <a href="#beneficios" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-lg font-medium text-slate-700 border-b border-slate-100">Benefícios</a>
                <a href="#depoimentos" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-lg font-medium text-slate-700">Depoimentos</a>
              </div>
              <div className="flex flex-col gap-3 px-4 pt-2">
                <Link href="/login?external=1" className="w-full py-4 text-center rounded-xl font-bold text-slate-700 bg-slate-100 active:bg-slate-200">
                  Entrar na conta
                </Link>
                <Link href="/register?external=1" className="w-full py-4 text-center rounded-xl font-bold text-white bg-blue-600 active:bg-blue-700 shadow-md">
                  Criar Conta Grátis
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-tr from-blue-200/40 to-indigo-100/40 rounded-[100%] blur-[120px] -z-10"></div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-sm font-bold shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
              O sistema nº 1 para anfitriões
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-8 leading-[1.1] tracking-tight">
              Simplifique a gestão dos seus imóveis e <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">lucre mais.</span>
            </h1>

            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Substitua planilhas confusas, agendas de papel e contratos manuais por um sistema único. Centralize reservas, controle pagamentos e pare de perder tempo com burocracia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/register?external=1"
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                Começar Grátis Agora <ArrowRight size={20} />
              </Link>
              <Link
                href="#como-funciona"
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center"
              >
                Ver como funciona
              </Link>
            </div>
            
            <p className="mt-6 text-sm text-slate-500 flex items-center justify-center lg:justify-start gap-2">
              <CheckCircle2 className="text-emerald-500" size={16} /> Sem cartão de crédito. Teste grátis.
            </p>
          </div>

          <div className="flex-1 w-full max-w-2xl lg:max-w-none relative z-10">
            <div className="relative rounded-2xl bg-slate-800 p-2 shadow-2xl border border-slate-700/50 transform lg:rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              {/* Fake Browser window */}
              <div className="flex items-center gap-2 px-3 py-2 mb-2 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white"></div>
                {/* Mockup visual cue */}
                <div className="relative w-full h-full p-6 flex flex-col gap-4 opacity-90">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex gap-3 items-center">
                       <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Calendar className="text-blue-600" size={20}/></div>
                       <div>
                         <div className="h-4 w-24 bg-slate-200 rounded-full mb-2"></div>
                         <div className="h-3 w-16 bg-slate-100 rounded-full"></div>
                       </div>
                    </div>
                    <div className="h-8 w-24 bg-blue-600/10 rounded-lg"></div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-24">
                        <div className="h-3 w-16 bg-slate-200 rounded-full mb-3"></div>
                        <div className="h-6 w-24 bg-emerald-500/20 rounded-md"></div>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-24">
                        <div className="h-3 w-16 bg-slate-200 rounded-full mb-3"></div>
                        <div className="h-6 w-20 bg-blue-500/20 rounded-md"></div>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-24">
                        <div className="h-3 w-16 bg-slate-200 rounded-full mb-3"></div>
                        <div className="h-6 w-12 bg-amber-500/20 rounded-md"></div>
                     </div>
                  </div>

                  <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                     <div className="flex justify-between mb-4 border-b border-slate-100 pb-2">
                       <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
                     </div>
                     <div className="space-y-3">
                       {[1,2,3].map(i => (
                         <div key={i} className="flex gap-2 items-center">
                           <div className="w-8 h-8 rounded-full bg-slate-100"></div>
                           <div className="h-3 w-full bg-slate-50 flex-1 rounded-sm"></div>
                           <div className="h-3 w-16 bg-slate-100 rounded-sm"></div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-xl flex items-center gap-4 animate-bounce hover:animate-none">
              <div className="bg-emerald-100 p-3 rounded-xl">
                <DollarSign className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Receita Mensal</p>
                <p className="text-lg font-black text-slate-900">+ R$ 12.450</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">
            Confiado por administradores em todo o Brasil
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
             {/* Logo placeholders - in a real app these would be real images */}
             <div className="text-2xl font-black text-slate-800">BookingHost</div>
             <div className="text-xl font-bold italic text-slate-800">LitoralImóveis</div>
             <div className="text-2xl font-black text-slate-800 tracking-tighter">TemporadaPRO</div>
             <div className="text-xl font-medium uppercase text-slate-800">Chalés&Cia</div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-slate-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">Administrar imóveis não deveria ser um caos.</h2>
          <p className="text-xl text-slate-600 mb-16">
            Você comprou imóveis para ter renda passiva e tranquilidade, mas acabou ganhando um segundo emprego exaustivo. Reconhece alguma dessas situações?
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
              <div className="text-red-500 mb-4 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                <X size={24} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Desorganização Total</h3>
              <p className="text-slate-700">Você já se perdeu entre grupos de WhatsApp, cadernos, emails e dezenas de mensagens para tentar fechar uma locação.</p>
            </div>
            
            <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
              <div className="text-red-500 mb-4 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                <X size={24} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Ansiedade Financeira</h3>
              <p className="text-slate-700">Cobrar sinais, lembrar de cobrar a outra metade no check-in... O controle financeiro é de cabeça e gera calotes.</p>
            </div>
            
            <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
              <div className="text-red-500 mb-4 bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                <X size={24} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Trabalho Manual Repetitivo</h3>
              <p className="text-slate-700">A cada cliente novo, lá vai você imprimir, preencher e enviar PDFs para assinatura perdendo horas do seu dia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution / How it works */}
      <section id="como-funciona" className="py-24 bg-white px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-4 block">A Solução Definitiva</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Recupere seu tempo. Nós fazemos o trabalho chato por você.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-12">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">1</div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Centralize tudo</h3>
                    <p className="text-slate-600 text-lg leading-relaxed">Cadastre seus imóveis, fotos e valores. Abandone de vez as planilhas e anotações espalhadas. Tenha seu portfólio na palma da mão.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">2</div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Controle reservas fácil</h3>
                    <p className="text-slate-600 text-lg leading-relaxed">Lance reservas em segundos. Nosso calendário mostra visualmente quem entra e sai, evitando qualquer tipo de choque de datas.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">3</div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Zero calotes e esquecimentos</h3>
                    <p className="text-slate-600 text-lg leading-relaxed">Gere contratos em PDF automaticamente e acompanhe cada centavo que entra. O dashboard faz as contas para você.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 transform translate-x-4 translate-y-4 rounded-3xl -z-10 opacity-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Dashboard Aluga Fácil - Visão Geral do Controle Financeiro" 
                className="rounded-3xl shadow-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="py-24 bg-slate-900 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-blue-400 font-bold tracking-wider uppercase text-sm mb-4 block">Recursos do Sistema</span>
            <h2 className="text-4xl md:text-5xl font-black mb-6">Tudo que um profissional precisa</h2>
            <p className="text-xl text-slate-400">Desenvolvido com o feedback de reais administradores de imóveis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                 <div
                  key={idx}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800 transition-all hover:-translate-y-1"
                >
                  <div className="h-14 w-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="text-blue-400" size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-24 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
           <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">O verdadeiro valor do sistema</h2>
            <p className="text-xl text-slate-600">Não somos apenas um software, somos o seu novo assistente virtual focado em lucros reais.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                 <div key={idx} className="text-center group">
                    <div className="w-20 h-20 mx-auto bg-slate-50 border-2 border-slate-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-blue-100 group-hover:bg-blue-50 transition-all duration-300">
                      <Icon size={32} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                    <p className="text-slate-600 text-lg">{benefit.description}</p>
                 </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 bg-blue-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Quem usa, não vive sem.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-lg mb-8 leading-relaxed font-medium">{testimonial.text}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900">
           {/* Visual background element */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600 rounded-full mix-blend-screen filter blur-[150px] opacity-40"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">Preparado para profissionalizar seu negócio?</h2>
          <p className="text-xl md:text-2xl mb-10 text-slate-300 font-light">
            Crie sua conta agora e experimente o Aluga Fácil de forma totalmente gratuita. Não exigimos cartão de crédito.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Link
              href="/register?external=1"
              className="px-10 py-5 bg-white text-slate-900 rounded-xl font-black text-xl hover:bg-blue-50 hover:scale-105 transition-all shadow-xl shadow-black/50"
            >
              Criar Conta Gratuita Agora
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Acesso imediato. Configuração em menos de 2 minutos.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center flex-col md:flex-row gap-8">
            <div className="flex items-center gap-2">
              <Logo href="/" size="medium" textColor="text-white" />
            </div>
            
            <div className="flex gap-4 items-center">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 5 3.66 9.12 8.44 9.88v-6.99h-2.54v-2.89h2.54V9.41c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.23 0-1.62.77-1.62 1.56v1.87h2.77l-.44 2.89h-2.33v6.99C18.34 21.12 22 17 22 12z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-pink-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm5 2a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm4.5-.5a1 1 0 110 2 1 1 0 010-2z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11.75 19h-2.5v-9h2.5v9zm-1.25-10.273c-.803 0-1.45-.658-1.45-1.468 0-.81.647-1.458 1.45-1.458.803 0 1.45.648 1.45 1.458 0 .81-.647 1.468-1.45 1.468zm13 10.273h-2.5v-4.735c0-1.13-.025-2.588-1.577-2.588-1.578 0-1.818 1.229-1.818 2.499v4.824h-2.5v-9h2.4v1.234h.034c.334-.632 1.148-1.298 2.362-1.298 2.524 0 2.993 1.662 2.993 3.822v5.242z"/></svg>
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 text-sm font-medium">
                <a href="#" onClick={handleOpenTerms} className="hover:text-white transition">Termos de Uso</a>
                <a href="#" onClick={handleOpenPrivacy} className="hover:text-white transition">Política de Privacidade</a>
                <a href="#" onClick={handleOpenContact} className="hover:text-white transition">Contato</a>
            </div>
          </div>
          
            <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <p>
              &copy; {new Date().getFullYear()}{' '}
              <span className="text-white font-semibold">Aluga Fácil</span>. Todos os direitos reservados.
            </p>
            <p>Feito para quem administra imóveis com inteligência.</p>
          </div>
        </div>
      </footer>
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between px-6 pt-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aluga Fácil</p>
                <h3 className="text-2xl font-bold text-slate-900">Termos de Uso</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition"
                aria-label="Fechar termos de uso"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 pb-16 space-y-6 text-slate-600 text-sm">
              <p>
                Este documento estabelece as regras para o uso da plataforma Aluga Fácil. Leia com atenção antes de continuar a utilizar o serviço.
              </p>
              {termsSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h4 className="text-base font-semibold text-slate-900">{section.title}</h4>
                  <p className="leading-relaxed">{section.content}</p>
                </div>
              ))}
              <p className="text-xs text-slate-400">
                Em caso de dúvidas, entre em contato pelo e-mail suporte@alugafacil.com.br. Atualizamos estes termos periodicamente; as mudanças entram em vigor imediatamente após a publicação.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsTermsOpen(false)}
                  className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between px-6 pt-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aluga Fácil</p>
                <h3 className="text-2xl font-bold text-slate-900">Política de Privacidade</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition"
                aria-label="Fechar política de privacidade"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 pb-16 space-y-6 text-slate-600 text-sm">
              <p>
                Esta Política descreve os dados que coletamos, como utilizamos e quais são seus direitos ao usar o Aluga Fácil.
              </p>
              {privacySections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h4 className="text-base font-semibold text-slate-900">{section.title}</h4>
                  <p className="leading-relaxed">{section.content}</p>
                </div>
              ))}
              <p className="text-xs text-slate-400">
                Para dúvidas adicionais, envie um e-mail para privacidade@alugafacil.com.br.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsPrivacyOpen(false)}
                  className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between px-6 pt-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aluga Fácil</p>
                <h3 className="text-2xl font-bold text-slate-900">Contato</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsContactOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition"
                aria-label="Fechar contato"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 pb-16 space-y-6 text-slate-600 text-sm">
              <p>
                Estamos prontos para ajudar você a profissionalizar suas locações. Escolha o canal abaixo e fale conosco agora mesmo.
              </p>
              <div className="space-y-4">
                {contactInfo.map((info) => (
                  <a
                    key={info.label}
                    href={info.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-1 rounded-2xl border border-slate-200 px-4 py-3 hover:border-blue-300 transition"
                  >
                    <span className="text-xs uppercase font-semibold tracking-[0.3em] text-slate-400">{info.label}</span>
                    <span className="text-lg font-bold text-slate-900">{info.value}</span>
                  </a>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsContactOpen(false)}
                  className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
