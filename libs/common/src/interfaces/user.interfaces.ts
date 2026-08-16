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

export type RegisterData = {
  email: string;
  password: string;
  name: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
};
