from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM provider: "anthropic" or "groq"
    llm_provider: str = "anthropic"

    anthropic_api_key: str = ""
    anthropic_base_url: str | None = None
    claude_model: str = "claude-sonnet-4-6"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    sift_host: str = "192.168.56.101"
    sift_port: int = 22
    sift_user: str = "sansforensics"
    sift_ssh_key_path: str = "~/.ssh/sift_id_rsa"

    forensiciq_host: str = "0.0.0.0"
    forensiciq_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    max_tokens: int = 8192
    max_correction_iterations: int = 3
    confidence_correction_threshold: float = 0.70

    class Config:
        env_file = ".env"


settings = Settings()  # type: ignore[call-arg]
