# Code & Words

Plataforma de programação e inglês em Next.js, React e MySQL. Backend integrado com Route Handlers e runtime Node.js.

## Funcionalidades

- 36 aulas: seis em cada trilha de HTML, CSS, JavaScript, Python, Java e C#.
- Fluxo de estudo, prática e questão; vocabulário de inglês em todas as aulas.
- Múltipla escolha, somatória e respostas curtas corrigidas por critérios explícitos.
- Python e Java recebem análise de sintaxe e requisitos; C# recebe conferência de estrutura e requisitos. Esses códigos não são compilados nem executados.
- Cadastro, login e logout.
- Senhas com scrypt e salt aleatório. Nenhuma senha é armazenada em texto puro.
- Sessões de sete dias em cookie HttpOnly/SameSite; o banco guarda somente o hash do token. Em HTTPS, o cookie também usa Secure.
- Progresso, tentativas, rascunhos e última aula por usuário.
- Salvamento automático após 1,2 segundo sem edição, botão para salvar imediatamente e salvamento ao mudar de aula ou sair da conta.
- Correção dos exercícios no servidor; o cliente não pode marcar arbitrariamente aulas como concluídas.
- Validação, consultas parametrizadas, proteção de origem nas escritas, limites de tamanho e tentativas limitadas pelo banco.
- Estudo sem conta continua disponível, com progresso temporário. Ao entrar, o site carrega os dados da conta; o progresso de visitante não é importado automaticamente.

## Executar neste computador

O ambiente já está configurado em `.env.local`, ignorado pelo Git. Não compartilhe esse arquivo.

```sh
npm run db:start
npm run dev
```

Abra http://127.0.0.1:3000. Use **Entrar / Criar conta** para criar sua própria conta. Aguarde a confirmação de salvamento antes de fechar a página.

O banco local usa **MariaDB 11.2**, compatível com MySQL, na porta **3308**, ligado somente a 127.0.0.1. Foi criada uma instância independente em `../../work/database/data`, sem alterar a instância existente do computador. O usuário da aplicação tem somente SELECT/INSERT/UPDATE/DELETE no banco `code_words`. A senha administrativa local fica em `../../work/database/admin.env`, fora dos arquivos servidos pelo site. Proteja esses arquivos com as permissões do sistema operacional.

`db:start` reutiliza essa instância sem instalar serviço do Windows. Execute novamente depois de reiniciar o computador. Os dados permanecem na pasta do banco.

## Configurar outro MySQL

1. Instale as dependências com `npm ci`.
2. Crie um banco vazio e um usuário com permissões restritas a ele.
3. Copie `.env.example` para `.env.local` e preencha a conexão. Configure uma conta de migração separada em `DB_MIGRATION_USER` e `DB_MIGRATION_PASSWORD` para criar tabelas.
4. Execute `npm run db:migrate`. A migração inicial é idempotente e não apaga dados. Ela precisa de CREATE/INDEX/REFERENCES; o usuário da aplicação precisa somente de SELECT/INSERT/UPDATE/DELETE.
5. Execute `npm run dev`.

Na instância local preparada neste computador, a migração usa automaticamente o arquivo administrativo fora do site. Para banco remoto, configure TLS com uma CA confiável em `DB_SSL_CA`. O navegador nunca se conecta diretamente ao banco.

## Testes e produção

```sh
npm test
# Com o servidor e o banco em execução:
npm run test:integration
npm run build
npm start
```

Os testes de integração criam duas contas artificiais em `example.invalid` e removem somente essas contas ao terminar. Cobrem cadastro, duplicidade, autenticação, hashes, sessões, rotação, expiração, logout, persistência, isolamento de usuários, correção, entradas inválidas, proteção de origem e limites de tentativas.

O backend exige um servidor Next.js/Node e um banco acessível a ele. A exportação estática anterior não atende mais à aplicação completa. O projeto ainda está **local**, sem publicação online. Para produção, configure `APP_ORIGIN` com a origem HTTPS exata, credenciais por secrets da hospedagem e backups do banco. Recuperação de senha e verificação de e-mail ainda não estão implementadas.

## API

Respostas de conta e progresso usam `Cache-Control: no-store`. Escritas exigem `Origin` igual a `APP_ORIGIN`; o usuário é determinado pela sessão, nunca por um ID enviado pelo navegador.

| Rota | Método | Uso |
| --- | --- | --- |
| `/api/auth/register` | POST | `{name,email,password}`; cria conta e sessão |
| `/api/auth/login` | POST | `{email,password}`; cria/rotaciona sessão |
| `/api/auth/logout` | POST | Revoga a sessão atual |
| `/api/auth/me` | GET | Retorna perfil básico ou `user: null` |
| `/api/progress` | GET | Recupera progresso, rascunhos e última aula |
| `/api/progress` | PUT | `{lessonId,code}`; salva rascunho e última aula |
| `/api/progress` | POST | `{lessonId,answer}`; registra e corrige a tentativa |
| `/api/practice` | POST | `{lessonId,code}`; confere requisitos de Python, Java e C# |

`answer` é o índice da alternativa (múltipla escolha), um array dos valores selecionados (somatória) ou um texto de 8 a 800 caracteres (descritiva). IDs de aulas estão em `app/lessons.js`. Por janela de 15 minutos: login 8 por e-mail/1.000 globais; cadastro 5 por e-mail/100 globais; rascunhos 300 por aluno; respostas 120 por aluno. O retorno 429 inclui `Retry-After: 900`. Ajuste ao tráfego real e complemente por IP na hospedagem antes de abrir ao público.

Arquivos principais: aulas em `app/lessons.js`, interface em `app/page.js`, formulário em `app/account-dialog.js`, regras do servidor em `lib/`, rotas em `app/api/` e esquema em `database/001-initial.sql`.
