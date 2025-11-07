const dotenv = require('dotenv');
dotenv.config();

const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { AgentExecutor, createToolCallingAgent } = require('langchain/agents');
const { Client, PrivateKey } = require('@hashgraph/sdk');
const { HederaLangchainToolkit, coreQueriesPlugin, coreAccountPlugin } = require('hedera-agent-kit');

// Choose your AI provider (install the one you want to use)
function createLLM() {
 
     // Option 2: Anthropic Claude (requires ANTHROPIC_API_KEY in .env)
 
   try {
   if (process.env.GROQ_API_KEY) {
    const { ChatGroq } = require('@langchain/groq');
    return new ChatGroq({ model: 'llama-3.3-70b-versatile' });
  }
  } catch (e) {
    console.error('No AI provider configured. Please either:');
    console.error('1. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY in .env');
    console.error('2. Install and run Ollama locally (https://ollama.com)');
    process.exit(1);
  }
}

async function main() {
  // Initialize AI model
  const llm = createLLM();

  // Hedera client setup (Testnet by default)
  const client = Client.forTestnet().setOperator(
    process.env.ACCOUNT_ID,
    PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY),
  );
  
  const hederaAgentToolkit = new HederaLangchainToolkit({
    client,
    configuration: {
      plugins: [
        coreQueriesPlugin, 
        coreAccountPlugin
      ],
    },
  });
  
  // Load the structured chat prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  // Fetch tools from toolkit
  const tools = hederaAgentToolkit.getTools();

  // Create the underlying agent
  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });
  
  // Wrap everything in an executor that will maintain memory
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });
  
const response = await agentExecutor.invoke({ input: "what's my balance?" });
const response_token = await agentExecutor.invoke({ input: "create a new token called 'TestToken' with symbol 'TEST'" });  
  console.log(response, response_token);
}

main().catch(console.error);
