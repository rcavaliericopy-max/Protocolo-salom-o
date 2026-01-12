// CONFIGURAÇÃO DA BIBLIOTECA PADRÃO
// Estrutura física necessária no servidor (Netlify/Pasta Public):
// public/audio/Remarcar/1 Boas Vindas.mp3
// public/audio/Mantras/Mantra 1.mp3

export const INITIAL_LIBRARY = [
  {
    folderName: 'Reprogramação', // Nome ajustado conforme solicitação para evitar duplicata
    tracks: [
      // ATENÇÃO: Os nomes de arquivo (filename) devem ser idênticos aos do computador (letras maiúsculas/minúsculas e acentos)
      { filename: 'Remarcar/1 Boas Vindas.mp3', name: '1. Boas Vindas' },
      { filename: 'Remarcar/2 Aviso importante.mp3', name: '2. Aviso Importante' },
      { filename: 'Remarcar/3 Estado de relaxamento.mp3', name: '3. Estado de Relaxamento' },
      { filename: 'Remarcar/4 Blindagem.mp3', name: '4. Blindagem' },
      { filename: 'Remarcar/5 Despertar.mp3', name: '5. Despertar' },
      { filename: 'Remarcar/6 Parabens.mp3', name: '6. Parabéns' }, // Arquivo físico: "6 Parabens.mp3"
      { filename: 'Remarcar/7 Ferramentas Extras.mp3', name: '7. Ferramentas Extras' },
      { filename: 'Remarcar/8 Ferramenta 1.mp3', name: '8. Ferramenta nº 1' },
      { filename: 'Remarcar/9 Ferramenta 2.mp3', name: '9. Ferramenta nº 2' },
      { filename: 'Remarcar/10 Ferramenta 3.mp3', name: '10. Ferramenta nº 3' }
    ]
  },
  {
    folderName: 'Mantras',
    tracks: [
      { filename: 'Mantras/Mantra 1.mp3', name: 'Mantra 1' },
      { filename: 'Mantras/Mantra 2.mp3', name: 'Mantra 2' },
      { filename: 'Mantras/Mantra 3.mp3', name: 'Mantra 3' }
    ]
  }
];