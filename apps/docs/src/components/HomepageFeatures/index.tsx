import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Écosystème Monorepo & Mobile",
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    description: (
      <>
        Next.js 16, NestJS, application mobile Expo React Native avec scan de
        cartes physiques, microservices Vision et Fetch, orchestrés par
        Turborepo.
      </>
    ),
  },
  {
    title: "Moteur Compétitif & IA Locale",
    Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    description: (
      <>
        Tournois suisses officiels, moteur de règles temps réel, similarité
        vectorielle pgvector et diagnostics de decks déterministes sans dépendance
        externe.
      </>
    ),
  },
  {
    title: "Marketplace & Ops Cloud",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>
        Réservations de stock pessimistes, grand livre de settlement vendeur,
        déploiement continu Coolify et routage sécurisé Cloudflare Tunnel.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
