from app.github_stats import extract_repo_info, get_github_stats


def test_extract_repo_info():
    owner, repo = extract_repo_info("https://github.com/fastapi/fastapi")
    assert owner == "fastapi"
    assert repo == "fastapi"

    owner_git, repo_git = extract_repo_info("https://github.com/psf/requests.git")
    assert owner_git == "psf"
    assert repo_git == "requests"

    invalid_owner, invalid_repo = extract_repo_info("https://gitlab.com/invalid/repo")
    assert invalid_owner is None
    assert invalid_repo is None

def test_get_github_stats_invalid():
    res = get_github_stats("https://invalid-url.com/foo/bar")
    assert res is None
