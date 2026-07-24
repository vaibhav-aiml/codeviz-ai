import os
import tempfile

from app.tasks import (
    detect_framework,
    detect_languages,
    get_code_samples,
    get_full_file_tree,
)


def test_detect_languages():
    with tempfile.TemporaryDirectory() as tmpdir:
        with open(os.path.join(tmpdir, "main.py"), "w") as f:
            f.write("print('hello')")
        with open(os.path.join(tmpdir, "app.ts"), "w") as f:
            f.write("console.log('hello')")

        langs = detect_languages(tmpdir)
        assert "Python" in langs
        assert "TypeScript" in langs

def test_detect_framework():
    with tempfile.TemporaryDirectory() as tmpdir:
        with open(os.path.join(tmpdir, "package.json"), "w") as f:
            f.write("{}")
        with open(os.path.join(tmpdir, "Dockerfile"), "w") as f:
            f.write("FROM python:3.11")

        frameworks = detect_framework(tmpdir)
        assert "Node.js" in frameworks
        assert "Docker" in frameworks

def test_get_full_file_tree():
    with tempfile.TemporaryDirectory() as tmpdir:
        sub_dir = os.path.join(tmpdir, "src")
        os.makedirs(sub_dir, exist_ok=True)
        with open(os.path.join(sub_dir, "index.js"), "w") as f:
            f.write("console.log('hi')")

        tree = get_full_file_tree(tmpdir)
        assert "/" in tree
        assert "src" in tree["/"]["dirs"]
        assert "src" in tree
        assert "index.js" in tree["src"]["files"]

def test_get_code_samples():
    with tempfile.TemporaryDirectory() as tmpdir:
        with open(os.path.join(tmpdir, "utils.py"), "w") as f:
            f.write("def add(a, b): return a + b")

        samples = get_code_samples(tmpdir)
        assert "utils.py" in samples
        assert "def add" in samples["utils.py"]
