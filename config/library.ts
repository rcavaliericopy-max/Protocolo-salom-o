// CONFIGURAÇÃO DA BIBLIOTECA PADRÃO
// 1. Coloque seus arquivos de áudio na pasta 'public/audio'
// 2. Configure aqui o nome da pasta (Playlist) e o nome do arquivo

export const INITIAL_LIBRARY = [
  {
    folderName: 'Mantras',
    tracks: [
      // Exemplo: Se você tem um arquivo 'public/audio/mantra1.mp3'
      { filename: 'mantra1.mp3', name: 'Mantra de Cura' },
      { filename: '432hz.mp3', name: 'Frequência 432Hz' }
    ]
  },
  {
    folderName: 'Reprogramação',
    tracks: [
      { filename: 'prosperidade.mp3', name: 'Eu Sou Prosperidade' },
      { filename: 'foco.mp3', name: 'Foco Absoluto' },
      { filename: 'confianca.mp3', name: 'Autoconfiança Blindada' }
    ]
  },
  {
    folderName: 'Meditação',
    tracks: [
      // Adicione seus arquivos aqui seguindo o padrão
      // { filename: 'nome-do-arquivo-na-pasta.mp3', name: 'Nome Bonito no Player' }
    ]
  }
];