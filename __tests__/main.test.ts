import { TriageBotConfig, processIssue } from '../src/main'

test('1.', () => {
  const config: TriageBotConfig = {
    labels: [
      {
        label: ':warning:Status: invalid (issue template not used)',
        glob: '*GENERATED_BY_TEMPLATE*',
        negate: true,
        comment:
          "Bonjour\nVous n'avez pas utilisé le modèle de création de ticket, votre ticket ne pourra pas être traité.\n\n Merci de sélectionner le modèle approprié à la création du ticket quand vous cliquez sur 'New Issue' "
      }
    ]
  }
  const body = 'zerzer\r\n\r\nzer\r\n\r\nzer\r\n\r\n\r\nGENERATED_BY_TEMPLATE\r\n'
  const { matchingLabels, comments } = processIssue({
    config,
    issue: { body }
  })
  expect(matchingLabels.length).toEqual(0)
  expect(comments.length).toEqual(0)
})

test('2.', () => {
  const config: TriageBotConfig = {
    labels: [
      {
        label: ':warning:Status: invalid (issue template not used)',
        glob: '*GENERATED_BY_TEMPLATE*',
        negate: true,
        comment:
          "Bonjour\nVous n'avez pas utilisé le modèle de création de ticket, votre ticket ne pourra pas être traité.\n\n Merci de sélectionner le modèle approprié à la création du ticket quand vous cliquez sur 'New Issue' "
      }
    ]
  }
  const body = 'zerzer\r\n\r\nzer\r\n\r\nzer\r\n\r\n\reee\r\n'
  const { matchingLabels, comments } = processIssue({
    config,
    issue: { body }
  })
  expect(matchingLabels.length).toEqual(1)
  expect(comments.length).toEqual(1)
})

test('3.', () => {
  const config: TriageBotConfig = {
    labels: [
      {
        label: ':warning:Status: invalid (issue template not used)',
        glob: '*GENERATED_BY_TEMPLATE*',
        negate: true,
        comment:
          "Bonjour\nVous n'avez pas utilisé le modèle de création de ticket, votre ticket ne pourra pas être traité.\n\n Merci de sélectionner le modèle approprié à la création du ticket quand vous cliquez sur 'New Issue' "
      }
    ]
  }
  const body = `
  @
2020-08-25T10:44:26.2817988Z @
2020-08-25T10:44:26.2818174Z
2020-08-25T10:44:26.2819412Z ## Résultat observé
2020-08-25T10:44:26.2819601Z
2020-08-25T10:44:26.2820329Z Le Bloc paiement est impossible à supprimer alors que la DSN associée est supprimée
2020-08-25T10:44:26.2820551Z
2020-08-25T10:44:26.2821485Z ![image](https://user-images.githubusercontent.com/66441178/91160764-1ba80580-e6ca-11ea-9348-0a525038b862.png)
2020-08-25T10:44:26.2821811Z
2020-08-25T10:44:26.2822349Z <!--
2020-08-25T10:44:26.2822521Z
2020-08-25T10:44:26.2823034Z -->
2020-08-25T10:44:26.2823201Z
2020-08-25T10:44:26.2823757Z ## Résultat attendu
2020-08-25T10:44:26.2824042Z
2020-08-25T10:44:26.2824715Z Possibilité de supprimer le bloc paiement si la DSN est supprimée.
2020-08-25T10:44:26.2825272Z <!--
2020-08-25T10:44:26.2825440Z
2020-08-25T10:44:26.2825952Z -->
2020-08-25T10:44:26.2826143Z
2020-08-25T10:44:26.2826736Z ## Comment reproduire le problème ?
2020-08-25T10:44:26.2826924Z
2020-08-25T10:44:26.2827439Z <!--
2020-08-25T10:44:26.2827760Z pas sure :
2020-08-25T10:44:26.2828326Z cloturer la paie d'Aout,
2020-08-25T10:44:26.2831097Z lancer la DSN de Septembre (erreur) au lieu de celle du mois d'aout (car le logiciel propose par défaut d'effectuer la DSN du mois suivant non cloturé).
2020-08-25T10:44:26.2832057Z Supprimer la DSN de Septembre, mais laisser le bloc paiement associé (oubli).
2020-08-25T10:44:26.2832686Z Faire la DSN d'aout.
2020-08-25T10:44:26.2833024Z Faire la paie de Septembre
2020-08-25T10:44:26.2833386Z Essayer de supprimer le bloc paiement de septembre pour faire la DSN de Septembre.
2020-08-25T10:44:26.2834009Z -->
2020-08-25T10:44:26.2834215Z
2020-08-25T10:44:26.2834776Z - Dossier : PERRIER
2020-08-25T10:44:26.2835339Z - Période : Aout
2020-08-25T10:44:26.2835899Z - Salarié :  NA
2020-08-25T10:44:26.2836592Z - Action à faire par l'utilisateur pour déclencher le résultat observé :
2020-08-25T10:44:26.2837733Z pas sure : cloturer la paie d'Aout, lancer la DSN de Septembre (erreur) au lieu de celle du mois d'aout (car le logiciel propose par défaut d'effectuer la DSN du mois suivant non cloturé). Supprimer la DSN de Septembre, mais laisser le bloc paiement associé.
2020-08-25T10:44:26.2838423Z Faire la DSN d'aout.
2020-08-25T10:44:26.2838771Z Faire la paie de Septembre
2020-08-25T10:44:26.2839968Z Essayer de supprimer le bloc paiement de septembre pour faire la DSN de Septembre.
2020-08-25T10:44:26.2840189Z
2020-08-25T10:44:26.2840899Z ## Le cas échéant : analyse et piste de résolution
2020-08-25T10:44:26.2841793Z Que le logiciel ne propose pas de faire la DSN du mois ouvert pour la paie, mais la DSN du mois qui n'a pas encore été réalisée.
2020-08-25T10:44:26.2843041Z En effet, il arrive que le client ait besoin d'accéder au mois suivant pour saisir sa paie alors que l'on a pas terminé les DSN.
2020-08-25T10:44:26.2843279Z
2020-08-25T10:44:26.2843810Z <!--
2020-08-25T10:44:26.2844583Z Ne renseignez cette partie que si vous pensez connaitre l'origine technique du problème, sinon laisser vide*
2020-08-25T10:44:26.2845304Z Dans tous les cas, une analyse sera effectuée par le service R&D*
2020-08-25T10:44:26.2845860Z -->
2020-08-25T10:44:26.2846029Z
2020-08-25T10:44:26.2846216Z
2020-08-25T10:44:26.2846856Z <!-- GENERATED_BY_TEMPLATE. NE PAS EFFACER CETTE LIGNE -->
2020-08-25T10:44:26.2847056Z
`
  const { matchingLabels, comments } = processIssue({
    config,
    issue: { body }
  })
  expect(matchingLabels.length).toEqual(0)
  expect(comments.length).toEqual(0)
})
