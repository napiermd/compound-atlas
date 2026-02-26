import unittest
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from src.scorer import StudyInput, compute_evidence_score


class TestEvidenceScorerFreshness(unittest.TestCase):
    def test_recent_high_quality_scores_higher_than_old_low_quality(self):
        recent = [
            StudyInput("RCT", 220, 2025, "INCREASE", True, ["Lab A"]),
            StudyInput("META_ANALYSIS", 1800, 2024, "INCREASE", True, ["Lab B"]),
            StudyInput("RCT", 140, 2023, "INCREASE", True, ["Lab C"]),
        ]
        old = [
            StudyInput("CASE_REPORT", 12, 2005, "MIXED", None, ["Lab X"]),
            StudyInput("ANIMAL", 20, 2002, "MIXED", None, ["Lab X"]),
            StudyInput("IN_VITRO", None, 2001, None, None, ["Lab X"]),
        ]

        recent_score = compute_evidence_score(recent)
        old_score = compute_evidence_score(old)

        self.assertGreater(recent_score["composite"], old_score["composite"])
        self.assertGreater(recent_score["factors"]["recency"], old_score["factors"]["recency"])

    def test_quality_consistency_bonus_present(self):
        mixed = [
            StudyInput("META_ANALYSIS", 1200, 2024, "INCREASE", True, ["Lab A"]),
            StudyInput("IN_VITRO", None, 2024, "INCREASE", True, ["Lab B"]),
            StudyInput("CASE_REPORT", 30, 2024, "INCREASE", True, ["Lab C"]),
        ]
        consistent = [
            StudyInput("RCT", 180, 2024, "INCREASE", True, ["Lab A"]),
            StudyInput("RCT", 160, 2023, "INCREASE", True, ["Lab B"]),
            StudyInput("RCT", 140, 2022, "INCREASE", True, ["Lab C"]),
        ]

        mixed_score = compute_evidence_score(mixed)
        consistent_score = compute_evidence_score(consistent)

        self.assertGreaterEqual(consistent_score["factors"]["study_quality"], mixed_score["factors"]["study_quality"])


if __name__ == "__main__":
    unittest.main()
