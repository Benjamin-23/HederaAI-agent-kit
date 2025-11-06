const dotenv = require('dotenv');
dotenv.config();

const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { AgentExecutor, createToolCallingAgent } = require('langchain/agents');
const { Client, PrivateKey } = require('@hashgraph/sdk');
const { HederaLangchainToolkit, coreQueriesPlugin } = require('hedera-agent-kit');

// Choose your AI provider (install the one you want to use)
function createLLM() {
 
     // Option 2: Anthropic Claude (requires ANTHROPIC_API_KEY in .env)
 
  try {
    console.log("api", process.env.ANTHROPIC_API_KEY)
  if (process.env.ANTHROPIC_API_KEY) 
    const { ChatAnthropic } = require('@langchain/agents');
    return new ChatAnthropic({ model: 'claude-3-haiku-20240307' });
  }
  } catch (e) {
    console.error('No AI provider configured. Please either:');
    console.error('1. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY in .env');
    process.exit(1);
  }
}

async function main() {
  // Initialize AI model
  const llm = createLLM();

  // Hedera client setup (Testnet by default)
  const client = Client.forTestnet().setOperator(
    process.env.HEDERA_ACCOUNT_ID,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY),
  );

  const hederaAgentToolkit = new HederaLangchainToolkit({
    client,
    configuration: {
      plugins: [coreQueriesPlugin] // all our core plugins here https://github.com/hedera-dev/hedera-agent-kit/tree/main/typescript/src/plugins
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
  console.log(response);
}

main().catch(console.error);
