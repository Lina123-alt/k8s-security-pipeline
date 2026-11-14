# k8s-security-pipeline

**Une application web sécurisée de bout en bout : du code jusqu'au cluster Kubernetes, avec des contrôles automatisés à chaque étape.**

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Lina123-alt/k8s-security-pipeline/badge)](https://scorecard.dev/viewer/?uri=github.com/Lina123-alt/k8s-security-pipeline)
![Licence](https://img.shields.io/badge/licence-MIT-blue)

Ce projet part d'une idée simple : **une application n'est pas sécurisée parce qu'on lui a ajouté un scanner à la fin**, mais parce que chaque étape de sa vie (code, dépendances, image Docker, déploiement, exécution) est contrôlée, et que rien ne passe en production si un contrôle échoue.

Il combine une application réelle (**Orderly**, une API de gestion de commandes avec son interface web) et la chaîne qui la construit, la vérifie, la déploie sur Kubernetes et la surveille pendant qu'elle tourne.

> Projet réalisé par **Lina**, étudiante en cybersécurité à l'ENSAK (Khouribga).

---

## Ce que le projet démontre

| Étape | Ce qui est en place |
|---|---|
| **Code** | Analyse statique (Semgrep), détection de secrets (Gitleaks), tests automatisés (pytest, Vitest) |
| **Dépendances** | `pip-audit` et `npm audit` à chaque Pull Request, Dependabot hebdomadaire (npm, pip, Docker, GitHub Actions) |
| **Image Docker** | Scan de vulnérabilités (Trivy), SBOM (Syft), signature (Cosign), image de base figée par empreinte, utilisateur non-root |
| **Chaîne CI/CD** | Actions GitHub figées par SHA, permissions minimales, Branch Protection stricte, **Security Gate** qui bloque la fusion |
| **Kubernetes** | NetworkPolicy, `runAsNonRoot`, sondes de santé, Secrets **chiffrés dans etcd**, politiques Kyverno, benchmark kube-bench |
| **Exécution** | Détection d'intrusion en temps réel avec **Falco** (eBPF) et une règle personnalisée |
| **Application** | Authentification JWT, rôles (user / operator / admin), rate limiting, révocation de tokens, TLS jusqu'à PostgreSQL |

## Architecture

### Du code à la fusion

```mermaid
flowchart LR
  A[Pull Request] --> B[14 jobs de sécurité et de tests]
  B --> C{Security Gate}
  C -->|tout est vert| D[Fusion dans main]
  C -->|un contrôle échoue| E[Fusion bloquée]
  D --> F[Image signée avec Cosign]
```

### À l'exécution

```mermaid
flowchart TB
  U[Navigateur - frontend React] -->|HTTPS| P
  subgraph Minikube
    P[Pod Orderly - FastAPI<br/>utilisateur non-root UID 1000]
    NP[NetworkPolicy]
    F[Falco - eBPF]
    E[(etcd<br/>Secrets chiffrés AES-CBC)]
  end
  P -->|TLS| DB[(PostgreSQL)]
  F -. observe les appels système .-> P
```

## Le pipeline : 14 jobs, un seul verdict

Chaque Pull Request déclenche ces jobs. Le **Security Gate** agrège leurs résultats, et la branche `main` n'accepte aucune fusion directe.

| Job | Outil | Ce qu'il vérifie |
|---|---|---|
| `secret-scan` | Gitleaks | Aucun secret dans le code ni dans l'historique |
| `code-scan` | Semgrep | Failles dans le code (analyse statique) |
| `dependency-scan` | pip-audit | Vulnérabilités connues des dépendances Python |
| `frontend-dependency-scan` | npm audit | Vulnérabilités des dépendances JavaScript |
| `backend-tests` / `frontend-tests` | pytest / Vitest | Le code fait ce qu'il doit faire |
| `image-scan` | Trivy | Vulnérabilités de l'image Docker |
| `sbom-generation` | Syft | Inventaire complet des composants de l'image |
| `k8s-policy-check` | Kyverno | Les manifests respectent les politiques de sécurité |
| `runtime-rules-check` | Falco | Les règles de détection sont valides |
| `dast-scan` | OWASP ZAP | Scan dynamique de l'application en fonctionnement |
| `k8s-cluster-benchmark` | kube-bench | Benchmark de sécurité d'un cluster Kubernetes |
| `sign-image` | Cosign | Signature de l'image (exécutée sur `main`) |
| `security-gate` | — | Bloque la fusion si un contrôle est rouge |

**Ce que ça change concrètement :** le pipeline a bloqué des fusions à cause de vulnérabilités publiées après mon dernier contrôle (`undici`, `follow-redirects`), et ses messages m'ont permis de les corriger avant qu'elles n'atteignent `main`.

## Sécurité de l'application

- **Authentification JWT** avec `PyJWT`. J'ai remplacé `python-jose` après avoir constaté que sa dépendance `ecdsa` portait une vulnérabilité sans correctif amont.
- **Contrôle d'accès par rôles** (user, operator, admin).
- **Rate limiting** sur la connexion et l'inscription.
- **Révocation de tokens** : un token déconnecté ne peut plus être réutilisé.
- **TLS** entre le frontend, l'API et PostgreSQL (`sslmode=require`).
- **Conteneur non-root** (UID 1000), avec sondes de santé.

## Sécurité du cluster

### Secrets chiffrés dans etcd

Par défaut, Kubernetes range ses Secrets **en clair** dans etcd. J'ai activé le chiffrement (`EncryptionConfiguration`, fournisseur `aescbc`) et vérifié le résultat en lisant directement etcd :

| | Adresse de la base lisible dans etcd ? |
|---|---|
| Avant | **Oui** (1 occurrence de `postgresql://`) |
| Après | **Non** (0 occurrence, valeur préfixée par `k8s:enc:aescbc:v1:key1`) |

La clé de chiffrement n'est **jamais versionnée** (`encryption-config.yaml` est dans le `.gitignore`).

### Détection d'intrusion avec Falco

Falco observe les appels système du noyau (sonde eBPF) et signale les comportements suspects. En plus des règles par défaut, une **règle personnalisée** ([`security/falco/custom_rules.yaml`](security/falco/custom_rules.yaml)) détecte tout shell lancé dans le conteneur `backend`, **y compris sans terminal**, ce que fait typiquement un attaquant qui exécute une commande à distance et que la règle par défaut ne couvre pas.

Exemple d'alerte obtenue en ouvrant un shell dans le pod :

```
Warning Shell suspect ouvert dans le conteneur backend (... commande=sh -c echo test conteneur=backend)
  container_name=backend k8s_pod_name=k8s-security-pipeline-... k8s_ns_name=default
```

![Alerte Falco](docs/images/falco-alert.png)

## Sécurité de la chaîne d'approvisionnement

Les attaques les plus récentes ne visent plus l'application, mais ce qui la construit. Mesures en place :

- **Actions GitHub figées par SHA** : une étiquette (`@v4`) peut être déplacée après coup, pas une empreinte.
- **Image de base figée par empreinte** (`python:3.13-slim@sha256:...`), mise à jour par Dependabot après revue.
- **Dependabot** surveille npm, pip, Docker et les actions, chaque semaine.
- **SBOM** généré à chaque build, **image signée** avec Cosign.
- **Permissions minimales** des workflows (`contents: read` par défaut).

### OpenSSF Scorecard

Le score a été mesuré dès le premier jour : **4,3/10**, puis **5,8/10** le même jour après l'ajout d'une licence, d'une politique de sécurité (`SECURITY.md`), de Dependabot et du figement des actions. Le critère `Vulnerabilities` est ensuite passé de **3 à 10** après la correction de `certifi`, `dnspython` et `pyasn1` (7 alertes). Le badge ci-dessus affiche le score actuel.

## Déployer le projet (Minikube)

Prérequis : Docker, Minikube, `kubectl`, Helm, et un PostgreSQL accessible depuis le cluster.

```bash
# 1. Démarrer le cluster et construire l'image
minikube start
docker build -t k8s-security-pipeline:latest -f docker/Dockerfile .
minikube image load k8s-security-pipeline:latest

# 2. Créer le Secret (ne jamais le versionner)
kubectl create secret generic orderly-secrets \
  --from-literal=database-url='postgresql://UTILISATEUR:MOT_DE_PASSE@HOTE:5432/orders?sslmode=require' \
  --from-literal=jwt-secret-key="$(openssl rand -hex 32)"

# 3. Déployer l'application et la NetworkPolicy
kubectl apply -f k8s/deployment.yaml -f k8s/network-policy.yaml

# 4. Installer Falco avec la règle personnalisée
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco --version 9.2.2 \
  -n falco --create-namespace -f k8s/falco-values.yaml \
  --set-file 'customRules.custom_rules\.yaml=security/falco/custom_rules.yaml'
```

Vérification de l'application :

```bash
kubectl port-forward deploy/k8s-security-pipeline 8080:8000
# puis ouvrir http://localhost:8080/docs (documentation interactive de l'API)
```

> `k8s/falco-values.yaml` est adapté à Minikube (montage du socket containerd, sonde eBPF moderne). Sur un autre cluster, ces valeurs sont à adapter.

## Limites connues

Un projet de sécurité doit dire ce qu'il ne fait pas :

- **La clé de chiffrement d'etcd est stockée sur le nœud du cluster.** C'est suffisant pour protéger un disque ou une sauvegarde volés, pas pour résister à un attaquant qui contrôle le nœud. En production, on la confierait à un service de gestion de clés (KMS).
- **Projet individuel** : le critère Scorecard `Code-Review` reste à 0, faute de second relecteur, et `Maintained` dépend de l'âge du dépôt.
- **Falco 0.44.1 plantait** sur le noyau récent de ma machine de test (erreur de décodage d'un appel système) ; la version **0.45.2** a réglé le problème.
- **Certaines étapes du cluster sont manuelles** (activation du chiffrement d'etcd, configuration de PostgreSQL pour accepter le cluster) et ne sont pas encore automatisées.

## Structure du dépôt

```
backend/      API FastAPI (auth, commandes, produits) et tests
frontend/     Interface React + Vite et tests Vitest
docker/       Dockerfile (image non-root, base figée par empreinte)
k8s/          Deployment, NetworkPolicy, valeurs Helm de Falco
security/     Règles Falco personnalisées
.github/      Workflows CI/CD (14 jobs) et configuration Dependabot
```

## Contribuer et signaler une vulnérabilité

Toute modification passe par une Pull Request et par le Security Gate. Pour signaler une vulnérabilité, voir [`SECURITY.md`](SECURITY.md).

## Licence

[MIT](LICENSE)
