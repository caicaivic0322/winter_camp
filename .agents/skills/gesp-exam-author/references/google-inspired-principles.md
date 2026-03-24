# Google-Inspired Design Principles

This skill follows five practical principles distilled from recent official Google guidance on prompt and agent design.

## 1. Provide enough context

Before generation, specify goal, audience, level, and format.

Source:

- Google Cloud, "Create an agent"
- Google for Developers, "Prompt design for Gemini Nano"

## 2. State hard constraints explicitly

The model performs better when the allowed scope is narrow and concrete.

For this skill, the hard constraints are:

- language must be C++ or Python
- difficulty must be GESP 1-6
- output must match repository Markdown format

Source:

- Google Cloud, "Create an agent"

## 3. Ask for missing high-impact inputs

Do not ask many questions up front. Ask only for the missing item that changes the result materially.

Source:

- Google Cloud, "Create an agent"

## 4. Use structured output with examples

Give the model an exact schema and a strong example instead of vague format requests.

Source:

- Google for Developers, "Prompt design for Gemini Nano"

## 5. Self-check before final output

Complex generation should include an internal review pass for completeness, consistency, and format safety.

Source:

- Google for Developers, "Evaluate prompt quality"
- Google Cloud, "Create an agent"

## Official references

- [Create an agent](https://docs.cloud.google.com/gemini/enterprise/docs/agent-designer/create-agent)
- [Prompt design for Gemini Nano](https://developers.google.com/ml-kit/genai/prompt/android/prompt-design)
- [Evaluate prompt quality](https://developers.google.com/ml-kit/genai/prompt/android/evaluate-prompt)
