{
  description = "Farstone — an island polity packaged as a PyFARS application";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    pyproject-nix = {
      url = "github:pyproject-nix/pyproject.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    pyfars = {
      url = "git+ssh://git@github.com/emsenn/pyfars?ref=main";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.flake-utils.follows = "flake-utils";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
      inputs.pyproject-build-systems.follows = "pyproject-build-systems";
    };
  };

  outputs = inputs@{ self, nixpkgs, flake-utils, pyproject-nix, uv2nix, pyproject-build-systems, pyfars, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        lib = pkgs.lib;
        python = pkgs.python313;

        workspace = uv2nix.lib.workspace.loadWorkspace {
          workspaceRoot = ./.;
        };

        uvOverlay = workspace.mkPyprojectOverlay {
          sourcePreference = "wheel";
        };

        pyfarsSourceOverlay = final: prev: {
          pyfars = prev.pyfars.overrideAttrs (_old: {
            src = pyfars;
          });
        };

        pythonSet =
          (pkgs.callPackage pyproject-nix.build.packages {
            inherit python;
          }).overrideScope (lib.composeManyExtensions [
            pyproject-build-systems.overlays.default
            uvOverlay
            pyfarsSourceOverlay
          ]);

        farstone = pythonSet.mkVirtualEnv
          "farstone-${(lib.importTOML ./pyproject.toml).project.version}"
          workspace.deps.default;

        pyfarsPkg = pyfars.packages.${system}.default;

      in {
        packages = {
          inherit farstone;
          default = farstone;
        };

        apps.farstone-engine = {
          type = "app";
          program = "${farstone}/bin/farstone-engine";
        };
        apps.farstone = {
          type = "app";
          program = "${farstone}/bin/farstone";
        };
        apps.default = self.apps.${system}.farstone-engine;

        checks = {
          farstone-help = pkgs.runCommand "farstone-help" { } ''
            ${farstone}/bin/farstone-engine --help > $out
          '';
          pyfars-cli = pkgs.runCommand "farstone-pyfars-cli" { } ''
            ${pyfarsPkg}/bin/pyfars --help > $out
          '';
          default = self.checks.${system}.farstone-help;
        };

        devShells.default = pkgs.mkShell {
          name = "farstone-dev";
          packages = [
            farstone
            pyfarsPkg
            pkgs.git
            pkgs.uv
          ];
          shellHook = ''
            echo "farstone development shell"
            echo "  farstone: $(command -v farstone)"
            echo "  pyfars:   $(command -v pyfars)"
            echo "Run with: FARSTONE_ROOT=$PWD farstone-engine"
            echo "Override PyFARS with: nix run --override-input pyfars path:/path/to/pyfars .#farstone-engine"
          '';
        };
      });
}
