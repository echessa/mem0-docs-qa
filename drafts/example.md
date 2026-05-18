In this guide, we'll build a support agent that remembers useful details about a user's previous conversations.

The app stores user preferences in Mem0. Mem0 stores each memory exactly as written, so we do not need to worry about inference behavior.

We'll use the OpenAI Response API to generate support replies.

Here is the search code:

```js
const results = await client.search('Find relevant user memories', {
  user_id: 'support-user-123',
  top_k: 5,
});
```

The app also uses OpenAI and Mem0 API keys:

```js
const openai = new OpenAI();
```
