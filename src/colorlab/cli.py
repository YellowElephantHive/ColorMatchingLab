import argparse
import json
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(prog="colorlab", description="Train, inspect and showcase textile color matching experiments.")
    sub = parser.add_subparsers(dest="command", required=True)
    ingest = sub.add_parser("import-data", help="Extract the four CSV sources from the original 7z archive")
    ingest.add_argument("archive", type=Path)
    ingest.add_argument("--out", type=Path, default=Path("data/raw"))
    train = sub.add_parser("train", help="Reproduce grouped OOF evaluation and fitted models")
    train.add_argument("--data", type=Path, default=Path("data/raw"))
    train.add_argument("--out", type=Path, default=Path("artifacts/run-01"))
    train.add_argument("--seed", type=int, default=42)
    train.add_argument("--folds", type=int, default=5)
    train.add_argument("--trees", type=int, default=240)
    export = sub.add_parser("export", help="Create an offline, interactive HTML showcase")
    export.add_argument("--run", type=Path, default=Path("artifacts/run-01"))
    export.add_argument("--out", type=Path, default=Path("reports/ColorMatchingLab.html"))
    prediction = sub.add_parser("predict", help="Predict from a JSON request (same schema as the API)")
    prediction.add_argument("--run", type=Path, default=Path("artifacts/run-01"))
    prediction.add_argument("--input", type=Path, required=True)
    prediction.add_argument("--out", type=Path)
    serve = sub.add_parser("serve", help="Launch the optional local API and showcase")
    serve.add_argument("--run", type=Path, default=Path("artifacts/run-01"))
    serve.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    try:
        if args.command == "import-data":
            import py7zr
            allowed = {"match_color_QD.csv", "MCwater(T).csv", "MCwater(T)MISS.csv", "MCwater(T)TRUE.csv"}
            with py7zr.SevenZipFile(args.archive) as archive:
                names = set(archive.getnames())
                if names != allowed:
                    raise ValueError("Archive must contain exactly the four expected CSV files at its root")
                if any((args.out / name).exists() for name in allowed):
                    raise ValueError("Destination already contains source files; use a new directory")
                args.out.mkdir(parents=True, exist_ok=True)
                archive.extractall(args.out)
            print(f"Imported {len(allowed)} source files into {args.out}")
        elif args.command == "train":
            from .modeling import train_all
            if args.folds < 2 or args.trees < 1:
                raise ValueError("Use at least two folds and one tree")
            report = train_all(args.data, args.out, args.seed, args.folds, args.trees)
            for experiment in report["experiments"]:
                result = experiment["models"]["rf"]["metrics"]
                print(f"{experiment['id']}: n={experiment['audit']['usable_rows']}, OOF PASS F1={result['f1_pass']:.4f}, NO-PASS recall={result['recall_no_pass']:.4f}")
        elif args.command == "export":
            from .report import export_html
            print(export_html(args.run, args.out).resolve())
        elif args.command == "predict":
            from .api import PredictionRequest
            from .inference import predict
            request = PredictionRequest.model_validate_json(args.input.read_text())
            result = predict(args.run, request.experiment, [x.model_dump() for x in request.records], request.model, request.threshold)
            output = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)
            if args.out:
                args.out.parent.mkdir(parents=True, exist_ok=True)
                args.out.write_text(output + "\n")
            else:
                print(output)
        elif args.command == "serve":
            import uvicorn
            from .api import create_app
            uvicorn.run(create_app(args.run), host="127.0.0.1", port=args.port)
    except (ValueError, FileNotFoundError) as error:
        parser.exit(2, f"error: {error}\n")


if __name__ == "__main__":
    main()
