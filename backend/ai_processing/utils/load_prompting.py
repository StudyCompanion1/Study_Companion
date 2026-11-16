from pathlib import Path


def load_prompt(name: str) -> str:
    """
    Load a Markdown prompt from the prompting_mds directory.
    Return the prompt content as a string.
    """
    return Path(f"ai_processing/prompting_mds/{name}.md").read_text(encoding="utf-8")
