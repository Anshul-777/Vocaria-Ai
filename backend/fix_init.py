import re

file_path = r'C:\Users\anshu\OneDrive\Desktop\Voice Crafter AI\voice-crafter\backend\app\models\__init__.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the start of BenchmarkRun
benchmark_idx = content.find('class BenchmarkRun(Base):')
if benchmark_idx == -1:
    print('Could not find BenchmarkRun!')
    exit(1)

# Keep everything before BenchmarkRun
correct_content = content[:benchmark_idx]

# Append the correct version of the classes
correct_content += '''class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    model_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("model_versions.id"))
    dataset_name: Mapped[str] = mapped_column(String(100), nullable=False)
    accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    precision: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recall: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    f1_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    eer: Mapped[Optional[float]] = mapped_column(Float, nullable=True)          # Equal Error Rate
    auc_roc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    false_positive_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    false_negative_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    p95_latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    throughput_rps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sample_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    device: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    run_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# --- Quality Analysis ---------------------------------------------------------

class QualityAnalysis(Base):
    __tablename__ = "quality_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    file_id: Mapped[str] = mapped_column(String(36), ForeignKey("uploaded_files.id"))
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)

    # Core metrics
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    sample_rate: Mapped[int] = mapped_column(Integer, nullable=False)
    bit_depth: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    channels: Mapped[int] = mapped_column(Integer, default=1)
    format: Mapped[str] = mapped_column(String(20), nullable=False)

    # Audio quality
    snr_db: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lufs: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    peak_db: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rms_db: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dynamic_range_db: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    clipping_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Speech analysis
    speech_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speech_duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pause_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    avg_pause_duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pitch_mean_hz: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pitch_std_hz: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speaking_rate_wpm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Noise
    noise_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    background_noise_level: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reverb_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Overall
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    suitability: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    issues: Mapped[List[str]] = mapped_column(JSON, default=list)
    recommendations: Mapped[List[str]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# --- Hub Interactions ---------------------------------------------------------

class SavedVoice(Base):
    __tablename__ = "saved_voices"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    voice_profile_id: Mapped[str] = mapped_column(String(36), ForeignKey("voice_profiles.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
'''

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(correct_content)

print('Successfully restored the end of __init__.py')
