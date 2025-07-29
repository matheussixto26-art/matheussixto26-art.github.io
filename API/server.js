// /api/server.js
// Nova versão que tenta buscar turmas de duas maneiras diferentes.

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors()); 
app.use(express.json());

// ROTA DE LOGIN
app.post('/api/login', async (req, res) => {
  const { ra, senha } = req.body;
  if (!ra || !senha) return res.status(400).json({ error: 'RA e Senha são obrigatórios.' });

  try {
    const response = await axios.post('https://sedintegracoes.educacao.sp.gov.br/credenciais/api/LoginCompletoToken', 
      { user: `${ra}SP`, senha },
      { headers: { 'Ocp-Apim-Subscription-Key': '2b03c1db3884488795f79c37c069381a' } }
    );
    res.status(200).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Falha no login', details: error.response?.data });
  }
});

// ROTA PARA BUSCAR TURMAS (ATUALIZADA COM LÓGICA INTELIGENTE)
app.post('/api/turmas', async (req, res) => {
  const { token, codigoAluno, login } = req.body; // Agora recebemos o login também
  if (!token || !codigoAluno || !login) return res.status(400).json({ error: 'Faltam parâmetros para buscar turmas.' });

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Ocp-Apim-Subscription-Key': '5936fddda3484fe1aa4436df1bd76dab'
  };

  try {
    // --- TENTATIVA 1: Usando o código numérico ---
    console.log(`Tentativa 1 com codigoAluno: ${codigoAluno}`);
    const url1 = `https://sedintegracoes.educacao.sp.gov.br/apihubintegracoes/api/v2/Turma/ListarTurmasPorAluno?codigoAluno=${codigoAluno}`;
    let response = await axios.get(url1, { headers });

    // Verifica se a primeira tentativa funcionou e retornou dados
    if (response.data && response.data.isSucess && response.data.data && response.data.data.length > 0) {
        console.log("Sucesso na Tentativa 1!");
        return res.status(200).json(response.data);
    }

    // --- TENTATIVA 2: Se a primeira falhou ou retornou dados nulos, tenta com o login ---
    console.log("Tentativa 1 falhou ou retornou dados nulos. Partindo para a Tentativa 2.");
    console.log(`Tentativa 2 com login: ${login}`);
    const url2 = `https://sedintegracoes.educacao.sp.gov.br/apihubintegracoes/api/v2/Turma/ListarTurmasPorAluno?codigoAluno=${login}`;
    response = await axios.get(url2, { headers });
    
    console.log("Resultado da Tentativa 2:", response.data);
    return res.status(200).json(response.data);

  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Falha ao buscar turmas', details: error.response?.data });
  }
});

// ROTA PARA MENSAGENS E AVISOS
app.post('/api/mensagens', async (req, res) => {
    const { token, codigoAluno, turmas } = req.body;
    if (!token || !codigoAluno || !turmas) return res.status(400).json({ error: 'Parâmetros insuficientes.' });
    
    const primeiraTurmaId = turmas.length > 0 ? turmas[0].codigo : null;
    if (!primeiraTurmaId) return res.status(400).json({ error: 'Nenhum código de turma encontrado.' });

    try {
        const [respostaNotificacoes, respostaAvisos] = await Promise.all([
            axios.get(`https://sedintegracoes.educacao.sp.gov.br/cmspwebservice/api/sala-do-futuro-alunos/consulta-notificacao?userId=${codigoAluno}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Ocp-Apim-Subscription-Key': '1a758fd2f6be41448079c9616a861b91' }
            }),
            axios.get(`https://sedintegracoes.educacao.sp.gov.br/muralavisosapi/api/mural-avisos/listar-avisos?CodigoUsuario=${codigoAluno}&PerfilAviso=1&Turmas=${primeiraTurmaId}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Ocp-Apim-Subscription-Key': 'efc224c33f02487c91c0a299634b2077' }
            })
        ]);
        res.status(200).json({ notificacoes: respostaNotificacoes.data, avisos: respostaAvisos.data });
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: 'Falha ao buscar mensagens.', details: error.response?.data });
    }
});

module.exports = app;

        
