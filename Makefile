.PHONY: generate-oapi

GENERATED_OAPI_DIR := internal/api
OAPI_PKG := github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest

generate-oapi:
	@command -v oapi-codegen >/dev/null 2>&1 || go install $(OAPI_PKG)
	@mkdir -p $(GENERATED_OAPI_DIR)
	@oapi-codegen -generate types      -package api -o $(GENERATED_OAPI_DIR)/types.gen.go  api/openapi.yaml
	@oapi-codegen -generate chi-server -package api -o $(GENERATED_OAPI_DIR)/server.gen.go api/openapi.yaml
