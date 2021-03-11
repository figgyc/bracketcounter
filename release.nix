
{ pkgs ? import <nixpkgs> {} }:

with pkgs;
rec {
  application = callPackage ./default.nix { src = ./.; };
}
