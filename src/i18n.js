// Interface languages. The app's markup is written in English; `translateTree` swaps exact
// English strings (text, placeholders, labels, titles) for the chosen language and keeps
// the originals, so switching back restores them. Anything not in the dictionary (names,
// numbers, chess notation) stays as it is. Arabic switches the page to right-to-left; the
// board itself always stays left-to-right (a1 bottom-left for White).

export const LANGUAGES = { en: 'English', fr: 'Français', es: 'Español', pt: 'Português', ar: 'العربية' };
export const RTL = new Set(['ar']);
export const LANG_KEY = 'vch.lang';

// [English, French, Spanish, Portuguese, Arabic]
const ROWS = [
  // Navigation and shell
  ['Play', 'Jouer', 'Jugar', 'Jogar', 'العب'],
  ['Arena', 'Arène', 'Arena', 'Arena', 'الساحة'],
  ['Watch', 'Regarder', 'Ver', 'Assistir', 'شاهد'],
  ['Community', 'Communauté', 'Comunidad', 'Comunidade', 'المجتمع'],
  ['Puzzles', 'Problèmes', 'Problemas', 'Problemas', 'الألغاز'],
  ['Learn', 'Apprendre', 'Aprender', 'Aprender', 'تعلّم'],
  ['Openings', 'Ouvertures', 'Aperturas', 'Aberturas', 'الافتتاحيات'],
  ['Famous Games', 'Parties célèbres', 'Partidas famosas', 'Partidas famosas', 'مباريات شهيرة'],
  ['Review', 'Analyse', 'Revisión', 'Revisão', 'المراجعة'],
  ['More', 'Plus', 'Más', 'Mais', 'المزيد'],
  ['Search', 'Rechercher', 'Buscar', 'Pesquisar', 'بحث'],
  ['Install App', "Installer l'app", 'Instalar app', 'Instalar app', 'ثبّت التطبيق'],
  ['Notifications', 'Notifications', 'Notificaciones', 'Notificações', 'الإشعارات'],
  ['Profile', 'Profil', 'Perfil', 'Perfil', 'الملف الشخصي'],
  ['Settings', 'Réglages', 'Ajustes', 'Configurações', 'الإعدادات'],
  ['Sign in', 'Se connecter', 'Iniciar sesión', 'Entrar', 'تسجيل الدخول'],
  ['Sign out', 'Se déconnecter', 'Cerrar sesión', 'Sair', 'تسجيل الخروج'],
  ['Create account', 'Créer un compte', 'Crear cuenta', 'Criar conta', 'إنشاء حساب'],
  ['Edit portrait & flag', 'Modifier portrait et drapeau', 'Editar retrato y bandera', 'Editar retrato e bandeira', 'تعديل الصورة والعلم'],
  ['Moderation', 'Modération', 'Moderación', 'Moderação', 'الإشراف'],
  // Home
  ['Play Better', 'Jouez mieux', 'Juega mejor', 'Jogue melhor', 'العب أفضل'],
  ['Chess', 'aux échecs', 'al ajedrez', 'xadrez', 'شطرنج'],
  ['Competitive games. Real progress. A community that thinks ahead.', 'Des parties disputées. De vrais progrès. Une communauté qui voit loin.', 'Partidas competitivas. Progreso real. Una comunidad que piensa por adelantado.', 'Partidas competitivas. Progresso real. Uma comunidade que pensa à frente.', 'مباريات تنافسية. تقدّم حقيقي. مجتمع يفكّر مسبقاً.'],
  ['Join Now', 'Rejoindre', 'Únete', 'Entrar agora', 'انضم الآن'],
  ['Improve', 'Progresser', 'Mejorar', 'Evoluir', 'تحسّن'],
  ['Belong', 'Appartenir', 'Pertenecer', 'Pertencer', 'انتمِ'],
  ['Rapid & Blitz', 'Rapide et blitz', 'Rápidas y blitz', 'Rápidas e blitz', 'سريع وخاطف'],
  ['Tournaments', 'Tournois', 'Torneos', 'Torneios', 'البطولات'],
  ['Ratings', 'Classements', 'Clasificaciones', 'Classificações', 'التصنيفات'],
  ['LIVE CHESS', 'ÉCHECS EN DIRECT', 'AJEDREZ EN VIVO', 'XADREZ AO VIVO', 'شطرنج مباشر'],
  ['Play your', 'Jouez votre', 'Juega tu', 'Jogue a sua', 'العب'],
  ['next game.', 'prochaine partie.', 'próxima partida.', 'próxima partida.', 'مباراتك القادمة.'],
  ['Guest play is instant. Rated games save your Elo and tournament record.', 'Jouez tout de suite en invité. Les parties classées enregistrent votre Elo et vos tournois.', 'Juega al instante como invitado. Las partidas puntuables guardan tu Elo y tus torneos.', 'Jogue na hora como convidado. Partidas ranqueadas guardam seu Elo e torneios.', 'العب فوراً كضيف. المباريات المصنّفة تحفظ تصنيفك وسجلّ بطولاتك.'],
  // Play modes
  ['Match', 'Partie', 'Partida', 'Partida', 'مباراة'],
  ['Room', 'Salon', 'Sala', 'Sala', 'غرفة'],
  ['Computer', 'Ordinateur', 'Ordenador', 'Computador', 'الحاسوب'],
  ['QUICK MATCH', 'PARTIE RAPIDE', 'PARTIDA RÁPIDA', 'PARTIDA RÁPIDA', 'مباراة سريعة'],
  ['Find your next opponent.', 'Trouvez votre prochain adversaire.', 'Encuentra tu próximo rival.', 'Encontre seu próximo adversário.', 'ابحث عن خصمك القادم.'],
  ['Choose a clock and queue for the closest available player.', 'Choisissez une cadence et attendez le joueur le plus proche de votre niveau.', 'Elige un ritmo y espera al jugador disponible más cercano.', 'Escolha o tempo e entre na fila pelo jogador mais próximo.', 'اختر الوقت وانتظر أقرب لاعب متاح.'],
  ['Find opponent', 'Trouver un adversaire', 'Buscar rival', 'Encontrar adversário', 'ابحث عن خصم'],
  ['Searching the pool', 'Recherche en cours', 'Buscando rival', 'Procurando', 'جارٍ البحث'],
  ['Expanding the Elo window while you wait.', "L'écart d'Elo s'élargit pendant l'attente.", 'Ampliando el rango de Elo mientras esperas.', 'Ampliando a faixa de Elo enquanto você espera.', 'نوسّع نطاق التصنيف أثناء انتظارك.'],
  ['players online', 'joueurs en ligne', 'jugadores en línea', 'jogadores online', 'لاعب متصل'],
  ['Casual', 'Amicale', 'Amistosa', 'Casual', 'ودّية'],
  ['Rated', 'Classée', 'Puntuable', 'Ranqueada', 'مصنّفة'],
  ['Create a private room', 'Créer un salon privé', 'Crear una sala privada', 'Criar uma sala privada', 'أنشئ غرفة خاصة'],
  ['Generate a shareable game link instantly.', 'Obtenez tout de suite un lien à partager.', 'Genera al instante un enlace para compartir.', 'Gere na hora um link para compartilhar.', 'أنشئ رابط مباراة للمشاركة فوراً.'],
  ['Guests can join casual rooms without an account.', 'Les invités peuvent rejoindre les salons amicaux sans compte.', 'Los invitados pueden unirse a salas amistosas sin cuenta.', 'Convidados entram em salas casuais sem conta.', 'يمكن للضيوف دخول الغرف الودّية دون حساب.'],
  ['GAME SETTINGS', 'RÉGLAGES DE LA PARTIE', 'AJUSTES DE LA PARTIDA', 'CONFIGURAÇÕES DA PARTIDA', 'إعدادات المباراة'],
  ['Time control', 'Cadence', 'Ritmo de juego', 'Tempo', 'التحكم بالوقت'],
  ['Room type', 'Type de salon', 'Tipo de sala', 'Tipo de sala', 'نوع الغرفة'],
  ['Variant', 'Variante', 'Variante', 'Variante', 'النوع'],
  ['Standard', 'Standard', 'Estándar', 'Padrão', 'قياسي'],
  ['Casual — Guest OK', 'Amicale — invités bienvenus', 'Amistosa — invitados bienvenidos', 'Casual — convidados podem', 'ودّية — مسموح للضيوف'],
  ['Rated — Account required', 'Classée — compte requis', 'Puntuable — requiere cuenta', 'Ranqueada — exige conta', 'مصنّفة — تتطلب حساباً'],
  ['Create room & get link', 'Créer le salon et le lien', 'Crear sala y enlace', 'Criar sala e link', 'أنشئ الغرفة واحصل على الرابط'],
  ['or join an existing room', 'ou rejoignez un salon existant', 'o únete a una sala existente', 'ou entre em uma sala existente', 'أو انضم إلى غرفة موجودة'],
  ['Enter room code', 'Code du salon', 'Código de sala', 'Código da sala', 'أدخل رمز الغرفة'],
  ['Join room', 'Rejoindre', 'Unirse', 'Entrar', 'انضم'],
  ['ROOM CODE', 'CODE DU SALON', 'CÓDIGO DE SALA', 'CÓDIGO DA SALA', 'رمز الغرفة'],
  ['Share this link', 'Partagez ce lien', 'Comparte este enlace', 'Compartilhe este link', 'شارك هذا الرابط'],
  ['Copy', 'Copier', 'Copiar', 'Copiar', 'نسخ'],
  ['Ready', 'Prêt', 'Lista', 'Pronta', 'جاهز'],
  ['Keep this tab open. Your opponent can enter from any modern browser.', "Gardez cet onglet ouvert. Votre adversaire peut entrer depuis n'importe quel navigateur récent.", 'Mantén esta pestaña abierta. Tu rival puede entrar desde cualquier navegador moderno.', 'Mantenha esta aba aberta. Seu adversário entra de qualquer navegador moderno.', 'أبقِ هذه الصفحة مفتوحة. يمكن لخصمك الدخول من أي متصفح حديث.'],
  ['PLAY STOCKFISH', 'JOUER CONTRE STOCKFISH', 'JUGAR CONTRA STOCKFISH', 'JOGAR CONTRA O STOCKFISH', 'العب ضد ستوكفيش'],
  ['Choose your opponent.', 'Choisissez votre adversaire.', 'Elige a tu rival.', 'Escolha seu adversário.', 'اختر خصمك.'],
  ['Each personality uses Stockfish 19 at a different target strength.', 'Chaque personnage utilise Stockfish 19 à un niveau différent.', 'Cada personaje usa Stockfish 19 con una fuerza distinta.', 'Cada personagem usa o Stockfish 19 com uma força diferente.', 'كل شخصية تستخدم ستوكفيش 19 بقوة مختلفة.'],
  ['White', 'Blancs', 'Blancas', 'Brancas', 'الأبيض'],
  ['Black', 'Noirs', 'Negras', 'Pretas', 'الأسود'],
  ['Random', 'Au hasard', 'Al azar', 'Aleatório', 'عشوائي'],
  ['Coach off', 'Coach désactivé', 'Entrenador apagado', 'Treinador desligado', 'المدرّب متوقف'],
  ['Coach on', 'Coach activé', 'Entrenador activo', 'Treinador ligado', 'المدرّب يعمل'],
  ['Start game', 'Commencer', 'Empezar', 'Começar', 'ابدأ المباراة'],
  ['The board resets when you start. Choose Black and the engine moves first.', "L'échiquier se remet à zéro au départ. Avec les Noirs, le moteur joue en premier.", 'El tablero se reinicia al empezar. Con negras, el motor mueve primero.', 'O tabuleiro reinicia ao começar. Com as pretas, o motor joga primeiro.', 'تُعاد الرقعة عند البدء. اختر الأسود ليبدأ المحرّك.'],
  // Game
  ['Waiting for opponent', "En attente de l'adversaire", 'Esperando al rival', 'Aguardando adversário', 'بانتظار الخصم'],
  ['Choose an opponent', 'Choisissez un adversaire', 'Elige un rival', 'Escolha um adversário', 'اختر خصماً'],
  ['⇄ Flip board', "⇄ Retourner l'échiquier", '⇄ Girar tablero', '⇄ Girar tabuleiro', '⇄ اقلب الرقعة'],
  ['♫ Sound on', '♫ Son activé', '♫ Sonido activado', '♫ Som ligado', '♫ الصوت يعمل'],
  ['♫ Sound off', '♫ Son coupé', '♫ Sonido apagado', '♫ Som desligado', '♫ الصوت متوقف'],
  ['▦ Board theme', '▦ Thème', '▦ Tema del tablero', '▦ Tema do tabuleiro', '▦ مظهر الرقعة'],
  ['⚑ Resign', '⚑ Abandonner', '⚑ Rendirse', '⚑ Abandonar', '⚑ استسلم'],
  ['Resign', 'Abandonner', 'Rendirse', 'Abandonar', 'استسلم'],
  ['Offer draw', 'Proposer nulle', 'Ofrecer tablas', 'Propor empate', 'اعرض التعادل'],
  ['Draw', 'Nulle', 'Tablas', 'Empate', 'تعادل'],
  ['Draw offer', 'Proposition de nulle', 'Oferta de tablas', 'Proposta de empate', 'عرض تعادل'],
  ['Accept', 'Accepter', 'Aceptar', 'Aceitar', 'قبول'],
  ['Decline', 'Refuser', 'Rechazar', 'Recusar', 'رفض'],
  ['Rematch', 'Revanche', 'Revancha', 'Revanche', 'إعادة المباراة'],
  ['New game', 'Nouvelle partie', 'Nueva partida', 'Nova partida', 'مباراة جديدة'],
  ['Hint', 'Indice', 'Pista', 'Dica', 'تلميح'],
  ['Undo', 'Annuler', 'Deshacer', 'Desfazer', 'تراجع'],
  ['Options', 'Options', 'Opciones', 'Opções', 'خيارات'],
  ['Takeback', 'Reprendre', 'Deshacer jugada', 'Voltar lance', 'استرجاع'],
  ['Ask to take back', 'Demander à reprendre', 'Pedir deshacer', 'Pedir para voltar', 'اطلب الاسترجاع'],
  ['Takeback request', 'Demande de reprise', 'Petición de deshacer', 'Pedido para voltar', 'طلب استرجاع'],
  ['Your opponent wants to take back their last move', 'Votre adversaire veut reprendre son dernier coup', 'Tu rival quiere deshacer su última jugada', 'Seu adversário quer voltar o último lance', 'يريد خصمك استرجاع نقلته الأخيرة'],
  ['Your opponent left', 'Votre adversaire est parti', 'Tu rival se fue', 'Seu adversário saiu', 'غادر خصمك'],
  ['Claim win', 'Réclamer la victoire', 'Reclamar victoria', 'Reivindicar vitória', 'اطلب الفوز'],
  ['Call it a draw', 'Déclarer nulle', 'Declarar tablas', 'Declarar empate', 'أعلن التعادل'],
  ['Your first move', 'Votre premier coup', 'Tu primera jugada', 'Seu primeiro lance', 'نقلتك الأولى'],
  ['Waiting for the first move', 'En attente du premier coup', 'Esperando la primera jugada', 'Aguardando o primeiro lance', 'بانتظار النقلة الأولى'],
  ['The clocks start after both first moves.', 'Les pendules démarrent après les deux premiers coups.', 'Los relojes empiezan tras las dos primeras jugadas.', 'Os relógios começam após os dois primeiros lances.', 'تبدأ الساعات بعد النقلتين الأوليين.'],
  ['Go Berserk', 'Mode Berserk', 'Modo Berserk', 'Modo Berserk', 'وضع الهيجان'],
  ['Berserk ready', 'Berserk disponible', 'Berserk listo', 'Berserk pronto', 'الهيجان جاهز'],
  ['Moves', 'Coups', 'Jugadas', 'Lances', 'النقلات'],
  ['Analysis', 'Analyse', 'Análisis', 'Análise', 'التحليل'],
  ['Engine Analysis', 'Analyse du moteur', 'Análisis del motor', 'Análise do motor', 'تحليل المحرّك'],
  ['Analysis begins after your move.', "L'analyse commence après votre coup.", 'El análisis empieza tras tu jugada.', 'A análise começa após o seu lance.', 'يبدأ التحليل بعد نقلتك.'],
  ['Equal position', 'Position égale', 'Posición igualada', 'Posição igual', 'وضع متكافئ'],
  ['Game ready — make a move.', 'Partie prête — à vous de jouer.', 'Partida lista — haz una jugada.', 'Partida pronta — faça um lance.', 'المباراة جاهزة — العب نقلة.'],
  ['White to move', 'Aux Blancs de jouer', 'Juegan blancas', 'Brancas jogam', 'دور الأبيض'],
  ['Black to move', 'Aux Noirs de jouer', 'Juegan negras', 'Pretas jogam', 'دور الأسود'],
  ['Chat', 'Discussion', 'Chat', 'Chat', 'الدردشة'],
  ['Send', 'Envoyer', 'Enviar', 'Enviar', 'إرسال'],
  ['Send a friendly message…', 'Envoyez un message amical…', 'Envía un mensaje amable…', 'Envie uma mensagem amigável…', 'أرسل رسالة ودّية…'],
  ['Previous', 'Précédent', 'Anterior', 'Anterior', 'السابق'],
  ['Next', 'Suivant', 'Siguiente', 'Próximo', 'التالي'],
  ['Back to your game', 'Retour à la partie', 'Volver a tu partida', 'Voltar à partida', 'عُد إلى مباراتك'],
  ['Stop watching', 'Arrêter de regarder', 'Dejar de ver', 'Parar de assistir', 'أوقف المشاهدة'],
  ['No live games right now', 'Aucune partie en direct', 'No hay partidas en vivo', 'Nenhuma partida ao vivo', 'لا توجد مباريات مباشرة الآن'],
  ['Game aborted', 'Partie annulée', 'Partida anulada', 'Partida anulada', 'أُلغيت المباراة'],
  ['You won', 'Vous avez gagné', 'Ganaste', 'Você venceu', 'لقد فزت'],
  ['You lost', 'Vous avez perdu', 'Perdiste', 'Você perdeu', 'لقد خسرت'],
  // Learn, puzzles, review
  ['Practice & Learn', "S'entraîner et apprendre", 'Practicar y aprender', 'Praticar e aprender', 'تدرّب وتعلّم'],
  ['Study lesson', 'Étudier la leçon', 'Estudiar lección', 'Estudar lição', 'ادرس الدرس'],
  ['Start a live puzzle', 'Commencer un problème', 'Empezar un problema', 'Começar um problema', 'ابدأ لغزاً'],
  ['Studies · annotate and share a line', 'Études · annotez et partagez une ligne', 'Estudios · anota y comparte una línea', 'Estudos · anote e compartilhe uma linha', 'الدراسات · علّق على خط وشاركه'],
  ['Puzzle Training', 'Entraînement tactique', 'Entrenamiento táctico', 'Treino tático', 'تدريب الألغاز'],
  ['Next puzzle', 'Problème suivant', 'Siguiente problema', 'Próximo problema', 'اللغز التالي'],
  ['Daily puzzle', 'Problème du jour', 'Problema del día', 'Problema do dia', 'لغز اليوم'],
  ['My puzzle stats', 'Mes statistiques', 'Mis estadísticas', 'Minhas estatísticas', 'إحصاءاتي'],
  ['Your puzzle rating', 'Votre classement problèmes', 'Tu puntuación de problemas', 'Sua pontuação de problemas', 'تصنيف ألغازك'],
  ['Learn from your mistakes', 'Apprendre de vos erreurs', 'Aprende de tus errores', 'Aprenda com seus erros', 'تعلّم من أخطائك'],
  ['Opening Explorer', 'Explorateur d’ouvertures', 'Explorador de aperturas', 'Explorador de aberturas', 'مستكشف الافتتاحيات'],
  ['Study this line', 'Étudier cette ligne', 'Estudiar esta línea', 'Estudar esta linha', 'ادرس هذا الخط'],
  ['Replay game', 'Rejouer la partie', 'Reproducir partida', 'Rever partida', 'أعد عرض المباراة'],
  ['My games', 'Mes parties', 'Mis partidas', 'Minhas partidas', 'مبارياتي'],
  ['Your form', 'Votre forme', 'Tu forma', 'Sua fase', 'مستواك'],
  ['Score', 'Score', 'Puntuación', 'Pontuação', 'النتيجة'],
  ['Reviewed accuracy', 'Précision analysée', 'Precisión revisada', 'Precisão revisada', 'الدقة بعد المراجعة'],
  ['Signature opening', 'Ouverture favorite', 'Apertura favorita', 'Abertura favorita', 'افتتاحيتك المفضّلة'],
  ['All', 'Toutes', 'Todas', 'Todas', 'الكل'],
  ['Wins', 'Victoires', 'Victorias', 'Vitórias', 'الانتصارات'],
  ['Losses', 'Défaites', 'Derrotas', 'Derrotas', 'الهزائم'],
  ['Draws', 'Nulles', 'Tablas', 'Empates', 'التعادلات'],
  ['vs Computer', "contre l'ordinateur", 'contra el ordenador', 'contra o computador', 'ضد الحاسوب'],
  ['Opening trainer · drill your own deviations', "Entraîneur d'ouvertures · vos propres écarts", 'Entrenador de aperturas · tus propias desviaciones', 'Treinador de aberturas · seus próprios desvios', 'مدرّب الافتتاحيات · تدرّب على انحرافاتك'],
  ['VCH explorer · what players here choose in any position', 'Explorateur VCH · les choix des joueurs dans chaque position', 'Explorador VCH · qué eligen los jugadores en cada posición', 'Explorador VCH · o que os jogadores escolhem em cada posição', 'مستكشف VCH · ماذا يختار اللاعبون هنا في كل وضع'],
  // Community
  ['Friends', 'Amis', 'Amigos', 'Amigos', 'الأصدقاء'],
  ['Clubs', 'Clubs', 'Clubes', 'Clubes', 'الأندية'],
  ['League', 'Ligue', 'Liga', 'Liga', 'الدوري'],
  ['Play your friends', 'Jouez avec vos amis', 'Juega con tus amigos', 'Jogue com seus amigos', 'العب مع أصدقائك'],
  ['Challenges', 'Défis', 'Desafíos', 'Desafios', 'التحديات'],
  ['Daily games', 'Parties par correspondance', 'Partidas diarias', 'Partidas diárias', 'المباريات اليومية'],
  ['Find players', 'Trouver des joueurs', 'Buscar jugadores', 'Encontrar jogadores', 'ابحث عن لاعبين'],
  ['Following', 'Abonnements', 'Siguiendo', 'Seguindo', 'تتابعهم'],
  ['Challenge', 'Défier', 'Desafiar', 'Desafiar', 'تحدَّ'],
  ['Follow', 'Suivre', 'Seguir', 'Seguir', 'تابِع'],
  ['Create a tournament · arena or Swiss', 'Créer un tournoi · arène ou suisse', 'Crear un torneo · arena o suizo', 'Criar um torneio · arena ou suíço', 'أنشئ بطولة · ساحة أو سويسري'],
  ['No arenas right now.', 'Aucune arène pour le moment.', 'No hay arenas ahora.', 'Nenhuma arena agora.', 'لا توجد ساحات الآن.'],
  // Account
  ['Save your rating and record', 'Gardez votre classement et vos résultats', 'Guarda tu puntuación y tu historial', 'Salve sua pontuação e histórico', 'احفظ تصنيفك وسجلّك'],
  ['Username', "Nom d'utilisateur", 'Nombre de usuario', 'Nome de usuário', 'اسم المستخدم'],
  ['Email', 'E-mail', 'Correo', 'E-mail', 'البريد الإلكتروني'],
  ['Password', 'Mot de passe', 'Contraseña', 'Senha', 'كلمة المرور'],
  ['Forgot password?', 'Mot de passe oublié ?', '¿Olvidaste la contraseña?', 'Esqueceu a senha?', 'نسيت كلمة المرور؟'],
  ['View my public profile', 'Voir mon profil public', 'Ver mi perfil público', 'Ver meu perfil público', 'اعرض ملفي العام'],
  ['Account settings', 'Paramètres du compte', 'Ajustes de la cuenta', 'Configurações da conta', 'إعدادات الحساب'],
  ['Change password', 'Changer le mot de passe', 'Cambiar contraseña', 'Mudar senha', 'غيّر كلمة المرور'],
  ['Download my data', 'Télécharger mes données', 'Descargar mis datos', 'Baixar meus dados', 'نزّل بياناتي'],
  ['Delete account', 'Supprimer le compte', 'Eliminar cuenta', 'Excluir conta', 'احذف الحساب'],
  ['Achievements', 'Succès', 'Logros', 'Conquistas', 'الإنجازات'],
  ['Bullet', 'Bullet', 'Bala', 'Bullet', 'رصاصي'],
  ['Blitz', 'Blitz', 'Blitz', 'Blitz', 'خاطف'],
  ['Rapid', 'Rapide', 'Rápida', 'Rápida', 'سريع'],
  ['Classical', 'Classique', 'Clásica', 'Clássica', 'كلاسيكي'],
  ['Daily', 'Par correspondance', 'Diaria', 'Diária', 'يومي'],
  // Settings
  ['Theme Studio', 'Atelier de thèmes', 'Estudio de temas', 'Estúdio de temas', 'استوديو المظهر'],
  ['Light squares', 'Cases claires', 'Casillas claras', 'Casas claras', 'المربعات الفاتحة'],
  ['Dark squares', 'Cases foncées', 'Casillas oscuras', 'Casas escuras', 'المربعات الداكنة'],
  ['Piece style', 'Style des pièces', 'Estilo de piezas', 'Estilo das peças', 'شكل القطع'],
  ['Wallpaper', "Fond d'écran", 'Fondo', 'Papel de parede', 'الخلفية'],
  ['Language', 'Langue', 'Idioma', 'Idioma', 'اللغة'],
  ['Board set', "Jeu d'échiquier", 'Juego de tablero', 'Conjunto de tabuleiro', 'طقم الرقعة'],
  ['Done', 'Terminé', 'Listo', 'Pronto', 'تم'],
  ['Close', 'Fermer', 'Cerrar', 'Fechar', 'إغلاق'],
  ['Back', 'Retour', 'Atrás', 'Voltar', 'رجوع'],
];
const COLS = { fr: 1, es: 2, pt: 3, ar: 4 };
export const DICTIONARY = Object.fromEntries(Object.entries(COLS).map(([lang, col]) => [lang, new Map(ROWS.map(r => [r[0], r[col]]))]));

export function detectLanguage(saved, navigatorLanguages = []) {
  if (saved && LANGUAGES[saved]) return saved;
  for (const tag of navigatorLanguages) { const base = String(tag || '').toLowerCase().split('-')[0]; if (LANGUAGES[base]) return base; }
  return 'en';
}
// More rows and patterns arrive with src/i18n-more.js (loaded only for other languages).
const PATTERNS = [];
export function addTranslations(rows = [], patterns = []) {
  for (const [lang, col] of Object.entries(COLS)) for (const r of rows) if (r[col] && !DICTIONARY[lang].has(r[0])) DICTIONARY[lang].set(r[0], r[col]);
  for (const [source, ...out] of patterns) PATTERNS.push({ re: new RegExp(source), out });
}
function fromPattern(text, lang) {
  const col = COLS[lang] - 1;
  for (const p of PATTERNS) {
    const m = p.re.exec(text);
    if (!m || !p.out[col]) continue;
    return p.out[col].replace(/([$%])(\d)/g, (_, kind, i) => { const v = m[Number(i)] ?? ''; return kind === '%' ? translateText(v, lang) || v : v; });
  }
  return null;
}
const exact = (text, lang) => DICTIONARY[lang].get(text) || fromPattern(text, lang);
export function translateText(text, lang) {
  if (lang === 'en' || !DICTIONARY[lang]) return null;
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const whole = exact(trimmed, lang);
  if (whole) return whole;
  // "You won · by checkmate": translate each part that can be, keep the rest (names, scores).
  if (trimmed.includes(' · ')) {
    const parts = trimmed.split(' · '), done = parts.map(x => exact(x.trim(), lang));
    if (done.some(Boolean)) return parts.map((x, i) => done[i] || x).join(' · ');
  }
  return null;
}

const ORIGINAL = new WeakMap(); // text node -> its English source; element -> {attr: English source}
const ATTRS = ['placeholder', 'aria-label', 'title'];
// The English source of a value we may have translated before. If the app has since
// written a new value (not our translation), that new value is the source.
function sourceOf(saved, current, lang) {
  if (saved == null) return current;
  const done = translateText(saved, lang);
  return current === saved || (done && current.trim() === done) ? saved : current;
}
// Translates a subtree in place (or restores English when lang is 'en').
export function translateTree(root, lang) {
  if (!root) return;
  const doc = root.ownerDocument || root;
  const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,[data-no-i18n]')) continue;
    const source = sourceOf(ORIGINAL.get(node), node.nodeValue, lang);
    ORIGINAL.set(node, source);
    const out = translateText(source, lang);
    const next = out ? source.match(/^\s*/)[0] + out + source.match(/\s*$/)[0] : source;
    if (node.nodeValue !== next) node.nodeValue = next;
  }
  const elements = root.querySelectorAll ? [root, ...root.querySelectorAll('[placeholder],[aria-label],[title]')] : [];
  for (const el of elements) {
    if (!el.getAttribute) continue;
    const saved = ORIGINAL.get(el) || {};
    for (const attr of ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      const source = sourceOf(saved[attr], el.getAttribute(attr), lang);
      saved[attr] = source;
      const next = translateText(source, lang) || source;
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    }
    ORIGINAL.set(el, saved);
  }
}
