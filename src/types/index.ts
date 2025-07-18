export enum Qualification {
  LIDER = 'Líder',
  EXPERT = 'Expert',
  RAZOAVEL = 'Razoável',
  INICIANTE = 'Iniciante',
}

export interface Agent {
  id: string;
  name: string;
  isAvailable: boolean;
  qualification: Qualification;
  leadCount: number;
}