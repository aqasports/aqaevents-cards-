import 'package:flutter/material.dart';
import '../../core/theme/aqa_theme.dart';

class TeachingSupportView extends StatelessWidget {
  const TeachingSupportView({super.key});

  static const List<Map<String, String>> _badges = [
    {
      'title': 'Starter',
      'asset': 'assets/images/badges/starter.png',
      'desc': 'Immersion initiale, adaptation respiratoire et confiance aquatique.'
    },
    {
      'title': 'Beginner',
      'asset': 'assets/images/badges/beginner.png',
      'desc': 'Equilibre assiste, bulles subaquatiques et premieres entrees dans l\'eau.'
    },
    {
      'title': 'Floater',
      'asset': 'assets/images/badges/floater.png',
      'desc': 'Flottaison ventrale et dorsale autonome (etoile de mer) et retournement.'
    },
    {
      'title': 'Dauphin',
      'asset': 'assets/images/badges/dauphin.png',
      'desc': 'Coulees hydrodynamiques, glisse profilée et ondulations subaquatiques.'
    },
    {
      'title': 'Crawler',
      'asset': 'assets/images/badges/crawler.png',
      'desc': 'Coordination bras/jambes crawl avec respiration laterale bilaterale.'
    },
    {
      'title': 'Brasseur',
      'asset': 'assets/images/badges/brasseur.png',
      'desc': 'Ciseau de brasse propulsif et synchronisation traction-respiration-glisse.'
    },
    {
      'title': 'Butterfly',
      'asset': 'assets/images/badges/butterfly.png',
      'desc': 'Ondulation papillon fluide, retour aerien simultane et gainage.'
    },
    {
      'title': 'Requin',
      'asset': 'assets/images/badges/requin.png',
      'desc': 'Perfectionnement multi-nages, virages culbutes et depart plot.'
    },
    {
      'title': 'Orca',
      'asset': 'assets/images/badges/orca.png',
      'desc': 'Endurance aerobie sur series longues et maitrise chronometrique.'
    },
    {
      'title': 'Full Swimmer',
      'asset': 'assets/images/badges/full_swimmer.png',
      'desc': 'Maitrise integrale 4 nages et excellence technique AQA Sports.'
    },
  ];

  static const List<Map<String, dynamic>> _curriculumModules = [
    {
      'title': 'Pedagogie Enfants (Crocodile • Dauphin • Requin)',
      'subtitle': 'Progression ludique et securite aquatique (4 a 14 ans)',
      'status': 'CURRICULUM OFFICIEL',
      'items': [
        'Protocole d\'adaptation sans brassards des la 1ere seance',
        'Jeux d\'immersion, anneaux subaquatiques et parcours flottants',
        'Apprentissage progressif du retournement de securite dorsal',
      ],
    },
    {
      'title': 'Programme Adultes (Formules G10 & MAX5)',
      'subtitle': 'Apprentissage, aquaphobie et perfectionnement 4 nages',
      'status': 'SUPPORT TERRAIN',
      'items': [
        'Gestion de la respiration aquatique et relachement cervical',
        'Educatifs de prise d\'appui (catch) et horizontalite du corps',
        'Series fractionnees d\'endurance adaptees aux groupes Hommes & Femmes',
      ],
    },
    {
      'title': 'Protocole Apnee & Securite Binome',
      'subtitle': 'Ventilation, apnee statique/dynamique et sauvetage',
      'status': 'SECURITE AQA',
      'items': [
        'Relaxation pre-apnee et interdiction stricte d\'hyperventilation',
        'Surveillance binome permanente en surface et signes de validation',
        'Technique de canard vertical et compensation Frenzel',
      ],
    },
    {
      'title': 'Bibliotheque Video & Fiches Educatifs Interactives',
      'subtitle': 'Demonstrations 3D, plans de seances PDF et chronometre bassin',
      'status': 'PHASE 2 • DEV LATER',
      'items': [
        'Videos HD hors-ligne des educatifs AQA par niveau',
        'Generateur automatique de seances hebdomadaires par groupe',
        'Partage direct des fiches d\'exercices vers l\'espace membre AQA',
      ],
    },
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // Hero Banner with Ocean Background
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
            border: Border.all(color: AqaTheme.borderTeal),
            boxShadow: AqaTheme.tealGlow,
            image: const DecorationImage(
              image: AssetImage('assets/images/ocean_bg.jpg'),
              fit: BoxFit.cover,
              colorFilter: ColorFilter.mode(
                Color(0xCC030712),
                BlendMode.darken,
              ),
            ),
          ),
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: AqaTheme.accentTeal.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                      border: Border.all(color: AqaTheme.accentTeal),
                    ),
                    child: const Text(
                      'AQA TEACHING SUPPORT',
                      style: TextStyle(
                        color: AqaTheme.accentTeal,
                        fontSize: 10.0,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10.0,
                      vertical: 4.0,
                    ),
                    decoration: BoxDecoration(
                      color: AqaTheme.statusWarningBg,
                      borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                      border: Border.all(color: AqaTheme.statusWarning),
                    ),
                    child: const Text(
                      'MODULE PHASE 2 (DEV LATER)',
                      style: TextStyle(
                        color: AqaTheme.statusWarning,
                        fontSize: 10.0,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14.0),
              const Text(
                'Referentiel Pedagogique & Badges AQA Swim',
                style: TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 19.0,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 6.0),
              const Text(
                'Support technique unifie pour les coachs AQA : paliers de progression officiels, criteres de validation des badges et fiches pedagogiques bord de bassin.',
                style: TextStyle(
                  color: AqaTheme.textMuted,
                  fontSize: 13.0,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20.0),

        // Official 10 AQA Progression Badges Showcase
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                '10 Badges Officiels de Progression AQA',
                style: TextStyle(
                  color: AqaTheme.textPrimary,
                  fontSize: 15.0,
                  fontWeight: FontWeight.w700,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            SizedBox(width: 8.0),
            Text(
              'Echelle 1.0 a 4.0',
              style: TextStyle(
                color: AqaTheme.accentTeal,
                fontSize: 12.0,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10.0),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 10.0,
            crossAxisSpacing: 10.0,
            childAspectRatio: 2.15,
          ),
          itemCount: _badges.length,
          itemBuilder: (context, index) {
            final b = _badges[index];
            return Container(
              padding: const EdgeInsets.all(10.0),
              decoration: BoxDecoration(
                color: AqaTheme.surfaceDark,
                borderRadius: BorderRadius.circular(AqaTheme.radiusMd),
                border: Border.all(color: AqaTheme.borderSubtle),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44.0,
                    height: 44.0,
                    padding: const EdgeInsets.all(4.0),
                    decoration: BoxDecoration(
                      color: AqaTheme.surfaceSecondary,
                      borderRadius: BorderRadius.circular(10.0),
                      border: Border.all(color: AqaTheme.borderSubtle),
                    ),
                    child: Image.asset(
                      b['asset']!,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.military_tech,
                        color: AqaTheme.accentTeal,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${index + 1}. ${b['title']}',
                          style: const TextStyle(
                            color: AqaTheme.textPrimary,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          b['desc']!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AqaTheme.textMuted,
                            fontSize: 10.5,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 24.0),

        // Curriculum Modules
        const Text(
          'Modules Pedagogiques & Roadmap Support',
          style: TextStyle(
            color: AqaTheme.textPrimary,
            fontSize: 15.0,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 10.0),
        ..._curriculumModules.map((mod) {
          final isDevLater = (mod['status'] as String).contains('PHASE 2');
          final items = mod['items'] as List<String>;
          return Container(
            margin: const EdgeInsets.only(bottom: 12.0),
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: AqaTheme.surfaceDark,
              borderRadius: BorderRadius.circular(AqaTheme.radiusLg),
              border: Border.all(
                color: isDevLater ? AqaTheme.statusWarning : AqaTheme.borderSubtle,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        mod['title'] as String,
                        style: const TextStyle(
                          color: AqaTheme.textPrimary,
                          fontSize: 14.0,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8.0),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8.0,
                        vertical: 3.0,
                      ),
                      decoration: BoxDecoration(
                        color: isDevLater
                            ? AqaTheme.statusWarningBg
                            : AqaTheme.statusInfoBg,
                        borderRadius: BorderRadius.circular(AqaTheme.radiusSm),
                      ),
                      child: Text(
                        mod['status'] as String,
                        style: TextStyle(
                          color: isDevLater
                              ? AqaTheme.statusWarning
                              : AqaTheme.primarySky,
                          fontSize: 10.0,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4.0),
                Text(
                  mod['subtitle'] as String,
                  style: const TextStyle(
                    color: AqaTheme.accentTeal,
                    fontSize: 12.0,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 10.0),
                ...items.map(
                  (line) => Padding(
                    padding: const EdgeInsets.only(bottom: 6.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(top: 3.0),
                          child: Icon(
                            Icons.check_circle_outline,
                            size: 14.0,
                            color: AqaTheme.primarySky,
                          ),
                        ),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: Text(
                            line,
                            style: const TextStyle(
                              color: AqaTheme.textMuted,
                              fontSize: 12.0,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
