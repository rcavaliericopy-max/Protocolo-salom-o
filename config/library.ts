// CONFIGURAÇÃO DA BIBLIOTECA PADRÃO
// IMPORTANTE: A pasta no seu computador deve se chamar 'public' (sem acento) e não 'público'.
// Estrutura:
// public/
//   audio/
//     Reprogramar/
//       1 Boas Vindas.mp3
//       ...
//     Mantras/
//       (seus mantras aqui)

export const INITIAL_LIBRARY = [
  {
    folderName: 'Reprogramação Neural',
    tracks: [
      { filename: 'Reprogramar/1 Boas Vindas.mp3', name: '1. Boas Vindas' },
      { filename: 'Reprogramar/2 Aviso importante.mp3', name: '2. Aviso Importante' },
      { filename: 'Reprogramar/3 Estado de relaxamento.mp3', name: '3. Estado de Relaxamento' },
      { filename: 'Reprogramar/4 Blindagem.mp3', name: '4. Blindagem' },
      { filename: 'Reprogramar/5 Despertar.mp3', name: '5. Despertar' },
      { filename: 'Reprogramar/6 Parabéns.mp3', name: '6. Parabéns' },
      { filename: 'Reprogramar/7 Ferramentas Extras.mp3', name: '7. Ferramentas Extras' },
      { filename: 'Reprogramar/8 Ferramente n°1.mp3', name: '8. Ferramenta nº 1' },
      { filename: 'Reprogramar/9 Ferramenta n°2.mp3', name: '9. Ferramenta nº 2' },
      { filename: 'Reprogramar/10 Ferramenta n°3.mp3', name: '10. Ferramenta nº 3' }
    ]
  },
  {
    folderName: 'Mantras',
    tracks: [
      // Adicione aqui os arquivos que você colocar na pasta public/audio/Mantras
      // Exemplo:
      // { filename: 'Mantras/omeunome.mp3', name: 'Mantra Om' }
    ]
  }
];