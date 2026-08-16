export interface IUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthUser extends Pick<IUser, 'id' | 'email'> {
  roles: string[];
}
